import { prisma } from "./db";
import { listarUsuarios, type Usuario } from "./usuarios";

/**
 * Sincronización de funcionarios con la base de datos
 * ────────────────────────────────────────────────────
 * La fuente de verdad de las credenciales sigue siendo `USUARIOS_JSON`
 * (no hay contraseñas en la base de datos en texto plano: se guarda el hash
 * `scrypt`). La tabla `Usuario` existe para:
 *
 * - dar integridad referencial a los casos (`Caso.usuarioId`);
 * - permitir desactivar un acceso (`activo = false`) sin borrar el historial;
 * - registrar quién creó cada caso.
 *
 * La sincronización es **idempotente**: se ejecuta al iniciar sesión y
 * actualiza nombre y hash de los funcionarios configurados.
 */

/**
 * Inserta o actualiza en la base de datos los funcionarios configurados.
 * Devuelve los que quedaron activos.
 */
export const sincronizarUsuarios = async (): Promise<Usuario[]> => {
  const usuarios = listarUsuarios();

  if (usuarios.length === 0) {
    return [];
  }

  for (const usuario of usuarios) {
    await prisma.usuario.upsert({
      where: { id: usuario.id },
      create: {
        id: usuario.id,
        nombre: usuario.nombre,
        passwordHash: usuario.passwordHash,
        activo: true,
      },
      update: {
        nombre: usuario.nombre,
        passwordHash: usuario.passwordHash,
      },
    });
  }

  return usuarios;
};

/**
 * Indica si el acceso del funcionario está activo en la base de datos.
 *
 * Si el funcionario todavía no está sincronizado (por ejemplo, porque la
 * tabla se creó después de su primer acceso), se permite el acceso: la
 * configuración del entorno manda.
 */
export const usuarioActivo = async (id: string): Promise<boolean> => {
  const registro = await prisma.usuario.findUnique({ where: { id } });

  if (!registro) {
    return true;
  }

  return registro.activo;
};

/** Desactiva el acceso de un funcionario conservando su historial. */
export const desactivarUsuario = async (id: string): Promise<void> => {
  await prisma.usuario.update({
    where: { id },
    data: { activo: false },
  });
};

/**
 * Garantiza que exista la fila del funcionario en la tabla `Usuario`.
 *
 * Los casos tienen clave foránea hacia `Usuario`, así que antes de guardar
 * un caso hay que asegurarse de que su autor existe.
 */
export const asegurarUsuario = async (
  id: string,
  nombre: string
): Promise<void> => {
  await prisma.usuario.upsert({
    where: { id },
    create: { id, nombre, passwordHash: "" },
    update: {},
  });
};
