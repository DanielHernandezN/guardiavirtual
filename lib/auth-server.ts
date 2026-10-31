import { cookies } from "next/headers";
import { SESION_COOKIE, verificarTokenSesion, type SesionPayload } from "./sesion";
import { buscarUsuario } from "./usuarios-db";

/**
 * Sesión en el servidor — Guardia Virtual
 * ───────────────────────────────────────
 * Wrapper de `next/headers` sobre las funciones puras de `lib/sesion.ts`.
 * Solo usar en Server Components, Route Handlers y Server Functions.
 */

export const obtenerSesion = async (): Promise<SesionPayload | null> => {
  const almacen = await cookies();
  const token = almacen.get(SESION_COOKIE)?.value;
  return verificarTokenSesion(token);
};

/** Indica si la sesión pertenece a un administrador. */
export const esAdministrador = (sesion: SesionPayload | null): boolean =>
  sesion?.rol === "ADMIN";

/**
 * Comprueba que quien llama sea un administrador **con acceso activo**.
 *
 * No basta con el rol que trae la cookie: se vuelve a consultar la base de
 * datos para que desactivar o rebajar a un administrador tenga efecto
 * inmediato, sin esperar a que caduque su sesión (8 h).
 *
 * Devuelve la sesión y el funcionario, o una `Response` lista para retornar.
 */
export const exigirAdministrador = async (): Promise<
  | { ok: true; sesion: SesionPayload; usuarioId: string }
  | { ok: false; respuesta: Response }
> => {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return {
      ok: false,
      respuesta: Response.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  let usuario;

  try {
    usuario = await buscarUsuario(sesion.id);
  } catch {
    return {
      ok: false,
      respuesta: Response.json(
        { error: "No se pudo consultar la base de datos de funcionarios." },
        { status: 503 }
      ),
    };
  }

  if (!usuario || !usuario.activo) {
    return {
      ok: false,
      respuesta: Response.json(
        { error: "El acceso de este funcionario está desactivado." },
        { status: 403 }
      ),
    };
  }

  if (usuario.rol !== "ADMIN") {
    return {
      ok: false,
      respuesta: Response.json(
        { error: "Solo un administrador puede gestionar funcionarios." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, sesion, usuarioId: usuario.id };
};
