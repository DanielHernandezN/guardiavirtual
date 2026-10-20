import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

/**
 * Sesión y credenciales — Guardia Virtual
 * ───────────────────────────────────────
 * Implementación PURA (sin dependencias de Next) para poder usarse tanto en
 * Route Handlers, como en el `proxy.ts` y en Server Components.
 *
 * La sesión es un token firme con HMAC (sin estado en servidor), guardado en
 * una cookie `HttpOnly`. No se almacenan contraseñas en texto plano: se usan
 * hashes `scrypt`.
 */

export const SESION_COOKIE = "gv_sesion";
export const SESION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas

export type SesionPayload = {
  id: string;
  nombre: string;
  /** Timestamp de expiración (ms). */
  exp: number;
};

const obtenerSecreto = (): string => {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) {
    console.warn(
      "[auth] SESSION_SECRET no está definido: usando un secreto de desarrollo inseguro. Definilo en .env.local."
    );
    return "dev-secret-cambiar-en-produccion";
  }
  return secreto;
};

/** Crea un token de sesión firmado con HMAC. */
export const crearTokenSesion = (payload: SesionPayload): string => {
  const cuerpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const firma = createHmac("sha256", obtenerSecreto())
    .update(cuerpo)
    .digest("base64url");
  return `${cuerpo}.${firma}`;
};

/** Verifica la firma y la expiración de un token de sesión. */
export const verificarTokenSesion = (
  token: string | undefined
): SesionPayload | null => {
  if (!token) return null;

  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;

  const esperada = createHmac("sha256", obtenerSecreto())
    .update(cuerpo)
    .digest("base64url");

  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(cuerpo, "base64url").toString("utf8")
    ) as SesionPayload;

    if (
      typeof payload.exp !== "number" ||
      payload.exp < Date.now() ||
      !payload.id ||
      !payload.nombre
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

/** Genera un hash `scrypt` de una contraseña (formato `salt:hash`). */
export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

/** Compara una contraseña con su hash almacenado (a prueba de timing). */
export const verificarPassword = (
  password: string,
  almacenado: string
): boolean => {
  const [salt, hash] = almacenado.split(":");
  if (!salt || !hash) return false;

  const calculado = scryptSync(password, salt, 64);
  const esperado = Buffer.from(hash, "hex");

  return (
    calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
  );
};
