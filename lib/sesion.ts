import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

import { esRol, type Rol } from "./usuarios";

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
  /** Grado o jerarquía del funcionario; opcional. */
  grado?: string | null;
  /** Rol del funcionario (`ADMIN` o `FUNCIONARIO`). */
  rol: Rol;
  /** Timestamp de expiración (ms). */
  exp: number;
};

const ES_PRODUCCION = process.env.NODE_ENV === "production";
let advertenciaEmitida = false;

/**
 * Devuelve el secreto de firma, o `null` si no está configurado.
 *
 * En **producción**, la ausencia de `SESSION_SECRET` deja el sistema
 * inaccesible (fallo cerrado): nadie puede autenticarse y nadie puede
 * falsificar una cookie de sesión, porque no hay forma de firmarla.
 */
const obtenerSecreto = (): string | null => {
  const secreto = process.env.SESSION_SECRET?.trim();

  if (secreto) return secreto;

  if (ES_PRODUCCION) {
    return null;
  }

  if (!advertenciaEmitida) {
    advertenciaEmitida = true;
    console.warn(
      "[auth] SESSION_SECRET no está definido: usando un secreto de desarrollo inseguro. Definilo en .env.local."
    );
  }

  return "dev-secret-cambiar-en-produccion";
};

/** Crea un token de sesión firmado con HMAC. */
export const crearTokenSesion = (payload: SesionPayload): string => {
  const secreto = obtenerSecreto();

  if (!secreto) {
    throw new Error(
      "SESSION_SECRET no está configurado: no se pueden emitir sesiones."
    );
  }

  const cuerpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const firma = createHmac("sha256", secreto).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
};

/** Verifica la firma y la expiración de un token de sesión. */
export const verificarTokenSesion = (
  token: string | undefined
): SesionPayload | null => {
  if (!token) return null;

  const secreto = obtenerSecreto();
  if (!secreto) return null;

  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;

  const esperada = createHmac("sha256", secreto)
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

    // Las sesiones emitidas antes de existir los roles no traen el campo:
    // se tratan como funcionario (nunca como administrador).
    return {
      ...payload,
      rol: esRol(payload.rol) ? payload.rol : "FUNCIONARIO",
    };
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
