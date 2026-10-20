import {
  crearTokenSesion,
  SESION_COOKIE,
  SESION_TTL_MS,
  verificarPassword,
} from "@/lib/sesion";
import { buscarUsuario } from "@/lib/usuarios";

/**
 * Inicio de sesión.
 * Valida las credenciales y emite una cookie de sesión `HttpOnly` firmada.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!id || !password) {
    return Response.json(
      { error: "Debe ingresar ID y contraseña." },
      { status: 400 }
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

  const token = crearTokenSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    exp: Date.now() + SESION_TTL_MS,
  });

  const respuesta = Response.json({
    ok: true,
    usuario: { id: usuario.id, nombre: usuario.nombre },
  });

  respuesta.headers.append(
    "Set-Cookie",
    `${SESION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      SESION_TTL_MS / 1000
    )}`
  );

  return respuesta;
}
