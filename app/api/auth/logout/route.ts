import { SESION_COOKIE } from "@/lib/sesion";

/** Cierre de sesión: caduca la cookie de sesión. */
export async function POST() {
  const respuesta = Response.json({ ok: true });

  respuesta.headers.append(
    "Set-Cookie",
    `${SESION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );

  return respuesta;
}
