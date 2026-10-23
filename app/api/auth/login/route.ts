import {
  crearTokenSesion,
  SESION_COOKIE,
  SESION_TTL_MS,
  verificarPassword,
} from "@/lib/sesion";
import { registrarUso } from "@/lib/limites";
import { buscarUsuario, hayUsuariosConfigurados } from "@/lib/usuarios";
import { sincronizarUsuarios, usuarioActivo } from "@/lib/usuarios-db";
import { leerJsonLimitado } from "@/lib/validacion";

/**
 * Intentos de acceso permitidos por IP en la ventana de un minuto.
 * Es un límite alto a propósito: varias personas de la misma unidad pueden
 * salir por la misma IP (NAT) al mismo tiempo.
 */
const LIMITE_INTENTOS = 20;

/**
 * Identificador de la ventana de intentos: la IP del cliente (si el
 * servidor la entrega) o un identificador genérico.
 */
const claveDeIntentos = (request: Request): string => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "desconocida";

  return `login:${ip}`;
};

/**
 * Inicio de sesión.
 * Valida las credenciales y emite una cookie de sesión `HttpOnly` firmada.
 */
export async function POST(request: Request) {
  // Se limita por IP (y no por ID) para frenar intentos de fuerza bruta
  // sobre cuentas ajenas.
  const limite = registrarUso(claveDeIntentos(request), {
    maximo: LIMITE_INTENTOS,
    ventanaMs: 60_000,
  });

  if (!limite.permitido) {
    return Response.json(
      {
        error: `Demasiados intentos de acceso. Intente de nuevo en ${limite.reintentoEnSegundos} segundos.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limite.reintentoEnSegundos) },
      }
    );
  }

  const cuerpo = await leerJsonLimitado(request, { maximo: 8 * 1024 });

  if (!cuerpo.ok) {
    return Response.json(
      { error: "La solicitud no tiene un formato válido." },
      { status: cuerpo.motivo === "tamaño" ? 413 : 400 }
    );
  }

  const body = (cuerpo.datos ?? {}) as Record<string, unknown>;
  const id = typeof body?.id === "string" ? body.id.trim().slice(0, 64) : "";
  const password =
    typeof body?.password === "string" ? body.password.slice(0, 200) : "";

  if (!id || !password) {
    return Response.json(
      { error: "Debe ingresar ID y contraseña." },
      { status: 400 }
    );
  }

  // Sin funcionarios configurados el sistema no admite accesos.
  if (!hayUsuariosConfigurados()) {
    return Response.json(
      {
        error:
          "No hay funcionarios configurados en el sistema (revisa USUARIOS_JSON).",
      },
      { status: 503 }
    );
  }

  const usuario = buscarUsuario(id);

  // Mismo mensaje para ID inexistente y contraseña incorrecta:
  // no revela qué parte de las credenciales es válida.
  if (!usuario || !verificarPassword(password, usuario.passwordHash)) {
    return Response.json(
      { error: "Credenciales inválidas." },
      { status: 401 }
    );
  }

  // Sincroniza el funcionario con la tabla `Usuario` y comprueba que su
  // acceso siga activo. Un fallo de base de datos no debe impedir el
  // acceso si las credenciales son correctas.
  try {
    await sincronizarUsuarios();

    if (!(await usuarioActivo(usuario.id))) {
      return Response.json(
        { error: "El acceso de este funcionario está desactivado." },
        { status: 403 }
      );
    }
  } catch {
    // La base de datos no es un requisito para autenticarse.
  }

  const token = crearTokenSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    grado: usuario.grado,
    exp: Date.now() + SESION_TTL_MS,
  });

  const respuesta = Response.json({
    ok: true,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      grado: usuario.grado,
    },
  });

  respuesta.headers.append(
    "Set-Cookie",
    `${SESION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      SESION_TTL_MS / 1000
    )}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );

  return respuesta;
}
