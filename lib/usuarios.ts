import { hashPassword } from "./sesion";

/**
 * Usuarios — Guardia Virtual
 * ──────────────────────────
 * Fuente de usuarios provisional (hasta la Fase 5, con base de datos).
 *
 * - Por defecto hay un único funcionario de demostración.
 * - Se pueden definir usuarios por entorno con `USUARIOS_JSON`, p. ej.:
 *   [{"id":"daniel.hernandez","nombre":"Daniel Hernández","password":"..."}]
 *
 * Las contraseñas se hashean con `scrypt` al iniciar.
 */

export type Usuario = {
  id: string;
  nombre: string;
  passwordHash: string;
};

type UsuarioConfig = {
  id: string;
  nombre: string;
  password: string;
};

/** Usuario de demostración (cambiar en producción). */
const USUARIOS_DEMO: UsuarioConfig[] = [
  {
    id: "daniel.hernandez",
    nombre: "Daniel Hernández Norambuena",
    password: "Guardia2026",
  },
];

const aUsuario = ({ id, nombre, password }: UsuarioConfig): Usuario => ({
  id,
  nombre,
  passwordHash: hashPassword(password),
});

const leerUsuarios = (): Usuario[] => {
  const crudo = process.env.USUARIOS_JSON;

  if (!crudo) {
    return USUARIOS_DEMO.map(aUsuario);
  }

  try {
    const lista = JSON.parse(crudo) as UsuarioConfig[];
    return lista.map(aUsuario);
  } catch {
    console.warn(
      "[auth] USUARIOS_JSON inválido: usando el usuario de demostración."
    );
    return USUARIOS_DEMO.map(aUsuario);
  }
};

/** Busca un usuario por su ID. */
export const buscarUsuario = (id: string): Usuario | null =>
  leerUsuarios().find((usuario) => usuario.id === id) ?? null;
