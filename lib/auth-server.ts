import { cookies } from "next/headers";
import { SESION_COOKIE, verificarTokenSesion, type SesionPayload } from "./sesion";

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
