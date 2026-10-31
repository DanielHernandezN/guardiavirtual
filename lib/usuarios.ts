import { z } from "zod";

/**
 * Funcionarios — Guardia Virtual
 * ──────────────────────────────
 * Reglas puras del dominio de usuarios: roles, validación de los datos que
 * llegan del panel de administración y reglas de seguridad (por ejemplo, no
 * dejar el sistema sin administradores).
 *
 * El acceso a la base de datos vive en `lib/usuarios-db.ts`. Este archivo no
 * importa Prisma para poder probarse sin base de datos.
 *
 * Las contraseñas **nunca** se guardan en claro: `lib/sesion.ts` las convierte
 * en un hash `scrypt` (`salt:hash`) antes de persistirlas.
 */

/** Roles disponibles. */
export const ROLES = ["ADMIN", "FUNCIONARIO"] as const;
export type Rol = (typeof ROLES)[number];

/** Etiqueta legible de cada rol. */
export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  FUNCIONARIO: "Funcionario",
};

/** Indica si un valor es un rol válido. */
export const esRol = (valor: unknown): valor is Rol =>
  valor === "ADMIN" || valor === "FUNCIONARIO";

/** Funcionario sin datos sensibles (lo que ve el panel). */
export type UsuarioPublico = {
  id: string;
  nombre: string;
  grado: string | null;
  rol: Rol;
  activo: boolean;
  /** Último inicio de sesión correcto, en ISO, o `null`. */
  ultimoAcceso: string | null;
  createdAt: string;
  /** Cantidad de casos guardados (para explicar por qué no se puede borrar). */
  casos: number;
};

/** Funcionario con su hash de contraseña (solo uso interno del servidor). */
export type UsuarioConHash = UsuarioPublico & { passwordHash: string };

/** Longitud mínima de una contraseña. */
export const PASSWORD_MINIMA = 8;
/** Longitud máxima aceptada (evita hashes costosos con entradas enormes). */
export const PASSWORD_MAXIMA = 200;

/** Formato del identificador de acceso: `daniel`, `daniel.hernandez`, etc. */
const ID_VALIDO = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/**
 * Normaliza un identificador para que sirva como credencial:
 * minúsculas, sin tildes, espacios convertidos en puntos.
 *
 * `"Daniel Hernández"` → `"daniel.hernandez"`
 */
export const normalizarIdUsuario = (valor: string): string =>
  valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);

/** Indica si el identificador ya está normalizado y es válido. */
export const idUsuarioValido = (id: string): boolean => ID_VALIDO.test(id);

const esquemaId = z
  .string()
  .trim()
  .min(1, "El ID es obligatorio.")
  .transform((valor) => normalizarIdUsuario(valor))
  .refine(
    idUsuarioValido,
    "El ID debe tener entre 3 y 32 caracteres y usar solo minúsculas, números, punto, guion o guion bajo."
  );

const esquemaNombre = z
  .string()
  .trim()
  .min(3, "El nombre debe tener al menos 3 caracteres.")
  .max(120, "El nombre no puede superar los 120 caracteres.");

const esquemaGrado = z
  .string()
  .trim()
  .max(60, "El grado no puede superar los 60 caracteres.")
  .optional()
  .nullable()
  .transform((valor) => (valor ? valor : null));

const esquemaPassword = z
  .string()
  .min(
    PASSWORD_MINIMA,
    `La contraseña debe tener al menos ${PASSWORD_MINIMA} caracteres.`
  )
  .max(PASSWORD_MAXIMA, "La contraseña es demasiado larga.");

/** Datos para crear un funcionario. */
export const esquemaCrearUsuario = z.object({
  id: esquemaId,
  nombre: esquemaNombre,
  grado: esquemaGrado,
  rol: z.enum(["ADMIN", "FUNCIONARIO"]).default("FUNCIONARIO"),
  password: esquemaPassword,
});

/** Datos editables de un funcionario (el ID no cambia). */
export const esquemaActualizarUsuario = z.object({
  nombre: esquemaNombre,
  grado: esquemaGrado,
  rol: z.enum(["ADMIN", "FUNCIONARIO"]),
});

/** Nueva contraseña (alta o restablecimiento). */
export const esquemaPasswordUsuario = z.object({
  password: esquemaPassword,
});

export type DatosCrearUsuario = z.infer<typeof esquemaCrearUsuario>;
export type DatosActualizarUsuario = z.infer<typeof esquemaActualizarUsuario>;

/**
 * Indica si la operación dejaría el sistema sin administradores activos.
 *
 * Se aplica al desactivar, eliminar o rebajar de rol al último administrador
 * activo: el sistema quedaría sin nadie que pueda crear funcionarios.
 */
export const dejariaSinAdministradores = ({
  rolActual,
  quedaActivo,
  rolNuevo,
  administradoresActivos,
}: {
  /** Rol que tiene hoy el funcionario. */
  rolActual: Rol;
  /** `false` si la operación lo desactiva o lo elimina. */
  quedaActivo: boolean;
  /** Rol que tendrá después; `null` si se elimina. */
  rolNuevo: Rol | null;
  /** Administradores activos que hay ahora (incluyéndolo). */
  administradoresActivos: number;
}): boolean => {
  if (rolActual !== "ADMIN") return false;
  if (administradoresActivos > 1) return false;

  const sigueSiendoAdminActivo = quedaActivo && rolNuevo === "ADMIN";

  return !sigueSiendoAdminActivo;
};

/** Mensaje único para el bloqueo del último administrador. */
export const MENSAJE_ULTIMO_ADMIN =
  "Debe quedar al menos un administrador activo. Cree o active otro administrador antes de hacer este cambio.";
