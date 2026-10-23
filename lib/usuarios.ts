import { hashPassword } from "./sesion";

/**
 * Usuarios — Guardia Virtual
 * ──────────────────────────
 * Fuente de usuarios provisional (hasta la Fase 5, con base de datos).
 *
 * Los funcionarios se configuran **únicamente** por la variable de entorno
 * `USUARIOS_JSON`:
 *
 *   [{"id":"daniel.hernandez","nombre":"Daniel Hernández","grado":"Sgto. 1ro.","password":"..."}]
 *
 * `grado` es opcional: si falta, el parte usa solo el nombre.
 *
 * No hay credenciales por defecto en el código: si `USUARIOS_JSON` no está
 * definida o es inválida, **nadie puede autenticarse**. Esto evita que el
 * repositorio contenga contraseñas de prueba utilizables.
 *
 * Las contraseñas se hashean con `scrypt` al iniciar.
 */

export type Usuario = {
  id: string;
  nombre: string;
  /** Grado o jerarquía (por ejemplo, "Sgto. 1ro."); opcional. */
  grado: string | null;
  passwordHash: string;
};

type UsuarioConfig = {
  id: string;
  nombre: string;
  grado?: string;
  password: string;
};

const aUsuario = ({
  id,
  nombre,
  grado,
  password,
}: UsuarioConfig): Usuario => ({
  id,
  nombre,
  grado: grado?.trim() || null,
  passwordHash: hashPassword(password),
});

/** Lista de funcionarios configurados en el entorno. */
export const listarUsuarios = (): Usuario[] => {
  const crudo = process.env.USUARIOS_JSON;

  if (!crudo) {
    console.error(
      "[auth] USUARIOS_JSON no está definida: no hay funcionarios con acceso."
    );
    return [];
  }

  try {
    const lista = JSON.parse(crudo) as UsuarioConfig[];

    if (!Array.isArray(lista) || lista.length === 0) {
      console.error(
        "[auth] USUARIOS_JSON está vacía o no es una lista: no hay funcionarios con acceso."
      );
      return [];
    }

    return lista.map(aUsuario);
  } catch {
    console.error(
      "[auth] USUARIOS_JSON no es un JSON válido: no hay funcionarios con acceso."
    );
    return [];
  }
};

/** Indica si hay al menos un funcionario configurado. */
export const hayUsuariosConfigurados = (): boolean =>
  listarUsuarios().length > 0;

/** Busca un usuario por su ID. */
export const buscarUsuario = (id: string): Usuario | null =>
  listarUsuarios().find((usuario) => usuario.id === id) ?? null;
