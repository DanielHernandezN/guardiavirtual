import {
  crearTokenSesion,
  SESION_COOKIE,
  SESION_TTL_MS,
  verificarPassword,
} from "@/lib/sesion";
import { registrarUso } from "@/lib/limites";
import {
  asegurarAdministradorInicial,
  buscarUsuario,
  contarUsuarios,
  registrarAcceso,
} from "@/lib/usuarios-db";
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
 *
 * Las credenciales se verifican contra la tabla `Usuario` (hash `scrypt`
 * persistente). No hay usuarios ni contraseñas en el código ni en variables
 * de entorno: si la base no responde, el acceso falla cerrado.
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

  let usuario;
  let hayFuncionarios;

  try {
    usuario = await buscarUsuario(id);
    hayFuncionarios = usuario !== null || (await contarUsuarios()) > 0;
  } catch {
    // Sin base de datos no se pueden verificar las credenciales: se falla
    // cerrado en vez de permitir el acceso.
    console.error("[auth] No se pudo consultar la tabla Usuario.");
    return Response.json(
      {
        error:
          "No se pudo verificar el acceso en este momento. Intente de nuevo en unos minutos.",
      },
      { status: 503 }
    );
  }

  // Sin funcionarios dados de alta el sistema no admite accesos.
  if (!hayFuncionarios) {
    return Response.json(
      {
        error:
          "El sistema todavía no tiene funcionarios. Ejecute el alta del administrador (npm run usuarios -- crear).",
      },
      { status: 503 }
    );
  }

  // Mismo mensaje para ID inexistente y contraseña incorrecta:
  // no revela qué parte de las credenciales es válida.
  if (!usuario || !verificarPassword(password, usuario.passwordHash)) {
    return Response.json(
      { error: "Credenciales inválidas." },
      { status: 401 }
    );
  }

  if (!usuario.activo) {
    return Response.json(
      { error: "El acceso de este funcionario está desactivado." },
      { status: 403 }
    );
  }

  // El registro del último acceso es informativo: si falla, no impide entrar.
  await registrarAcceso(usuario.id).catch(() => undefined);

  // Si el sistema quedó sin administradores (migración desde `USUARIOS_JSON`),
  // se recupera el acceso de administrador para no quedar bloqueado.
  const promovido = await asegurarAdministradorInicial().catch(() => null);
  const rol = promovido === usuario.id ? "ADMIN" : usuario.rol;

  const token = crearTokenSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    grado: usuario.grado,
    rol,
    exp: Date.now() + SESION_TTL_MS,
  });

  const respuesta = Response.json({
    ok: true,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      grado: usuario.grado,
      rol,
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
