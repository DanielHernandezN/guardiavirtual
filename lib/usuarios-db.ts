import { prisma } from "./db";
import { ErrorConflicto } from "./errores";
import { hashPassword } from "./sesion";
import {
  dejariaSinAdministradores,
  esRol,
  MENSAJE_ULTIMO_ADMIN,
  type DatosActualizarUsuario,
  type DatosCrearUsuario,
  type Rol,
  type UsuarioConHash,
  type UsuarioPublico,
} from "./usuarios";

/**
 * Funcionarios en la base de datos — Guardia Virtual
 * ──────────────────────────────────────────────────
 * La tabla `Usuario` es la **fuente de verdad** de las credenciales: el hash
 * `scrypt` se guarda una sola vez (al crear el funcionario o al cambiar la
 * contraseña) y no se regenera en cada arranque.
 *
 * Reglas que se aplican aquí:
 *
 * - El ID no se puede repetir ni cambiar (es la credencial de acceso).
 * - Nunca se elimina al último administrador activo: el sistema quedaría sin
 *   nadie que pueda crear funcionarios.
 * - Un funcionario con casos guardados no se borra definitivamente (sus casos
 *   se perderían en cascada); se desactiva, que conserva el historial.
 */

type RegistroUsuario = {
  id: string;
  nombre: string;
  grado: string | null;
  rol: string;
  passwordHash: string;
  activo: boolean;
  ultimoAcceso: Date | null;
  createdAt: Date;
};

const rolSeguro = (valor: string): Rol => (esRol(valor) ? valor : "FUNCIONARIO");

const aPublico = (
  registro: RegistroUsuario,
  casos = 0
): UsuarioPublico => ({
  id: registro.id,
  nombre: registro.nombre,
  grado: registro.grado,
  rol: rolSeguro(registro.rol),
  activo: registro.activo,
  ultimoAcceso: registro.ultimoAcceso?.toISOString() ?? null,
  createdAt: registro.createdAt.toISOString(),
  casos,
});

const aConHash = (
  registro: RegistroUsuario,
  casos = 0
): UsuarioConHash => ({
  ...aPublico(registro, casos),
  passwordHash: registro.passwordHash,
});

/** Lista de funcionarios (administradores primero), sin datos sensibles. */
export const listarUsuarios = async (): Promise<UsuarioPublico[]> => {
  const registros = await prisma.usuario.findMany({
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { casos: true } } },
  });

  return registros.map((registro) => aPublico(registro, registro._count.casos));
};

/** Busca un funcionario por su ID, con el hash para verificar la contraseña. */
export const buscarUsuario = async (
  id: string
): Promise<UsuarioConHash | null> => {
  const registro = await prisma.usuario.findUnique({ where: { id } });

  if (!registro) return null;

  return aConHash(registro);
};

/** Cantidad total de funcionarios (incluye desactivados). */
export const contarUsuarios = (): Promise<number> => prisma.usuario.count();

/** Cantidad de administradores con acceso activo. */
export const contarAdministradoresActivos = (): Promise<number> =>
  prisma.usuario.count({ where: { rol: "ADMIN", activo: true } });

/**
 * Crea un funcionario con su hash de contraseña.
 * Si el ID ya existe, lanza `ErrorConflicto` (409).
 */
export const crearUsuario = async (
  datos: DatosCrearUsuario
): Promise<UsuarioPublico> => {
  const existente = await prisma.usuario.findUnique({
    where: { id: datos.id },
    select: { id: true },
  });

  if (existente) {
    throw new ErrorConflicto(
      `Ya existe un funcionario con el ID "${datos.id}".`
    );
  }

  const registro = await prisma.usuario.create({
    data: {
      id: datos.id,
      nombre: datos.nombre,
      grado: datos.grado,
      rol: datos.rol,
      passwordHash: hashPassword(datos.password),
      activo: true,
    },
  });

  return aPublico(registro);
};

/** Actualiza nombre, grado y rol. */
export const actualizarUsuario = async (
  id: string,
  datos: DatosActualizarUsuario
): Promise<UsuarioPublico> => {
  const actual = await prisma.usuario.findUnique({ where: { id } });

  if (!actual) {
    throw new ErrorConflicto("El funcionario no existe.");
  }

  const rolActual = rolSeguro(actual.rol);
  const administradores = await contarAdministradoresActivos();

  if (
    dejariaSinAdministradores({
      rolActual,
      quedaActivo: actual.activo,
      rolNuevo: datos.rol,
      administradoresActivos: administradores,
    })
  ) {
    throw new ErrorConflicto(MENSAJE_ULTIMO_ADMIN);
  }

  const registro = await prisma.usuario.update({
    where: { id },
    data: {
      nombre: datos.nombre,
      grado: datos.grado,
      rol: datos.rol,
    },
  });

  return aPublico(registro);
};

/** Cambia (o restablece) la contraseña de un funcionario. */
export const cambiarPassword = async (
  id: string,
  password: string
): Promise<void> => {
  const existente = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existente) {
    throw new ErrorConflicto("El funcionario no existe.");
  }

  await prisma.usuario.update({
    where: { id },
    data: { passwordHash: hashPassword(password) },
  });
};

/**
 * Activa o desactiva el acceso de un funcionario.
 * Desactivar conserva sus casos y su historial.
 */
export const establecerActivo = async (
  id: string,
  activo: boolean
): Promise<UsuarioPublico> => {
  const actual = await prisma.usuario.findUnique({ where: { id } });

  if (!actual) {
    throw new ErrorConflicto("El funcionario no existe.");
  }

  if (!activo) {
    const administradores = await contarAdministradoresActivos();

    if (
      dejariaSinAdministradores({
        rolActual: rolSeguro(actual.rol),
        quedaActivo: false,
        rolNuevo: rolSeguro(actual.rol),
        administradoresActivos: administradores,
      })
    ) {
      throw new ErrorConflicto(MENSAJE_ULTIMO_ADMIN);
    }
  }

  const registro = await prisma.usuario.update({
    where: { id },
    data: { activo },
  });

  return aPublico(registro);
};

/**
 * Elimina definitivamente a un funcionario **solo si no tiene casos**.
 *
 * Si tiene historial, se debe desactivar: la clave foránea de `Caso` es
 * `onDelete: Cascade` y borrar al funcionario borraría sus partes.
 */
export const eliminarUsuario = async (id: string): Promise<void> => {
  const actual = await prisma.usuario.findUnique({
    where: { id },
    include: { _count: { select: { casos: true } } },
  });

  if (!actual) {
    throw new ErrorConflicto("El funcionario no existe.");
  }

  if (actual._count.casos > 0) {
    throw new ErrorConflicto(
      `El funcionario tiene ${actual._count.casos} caso(s) guardado(s). Desactívelo para quitarle el acceso sin perder el historial.`
    );
  }

  const administradores = await contarAdministradoresActivos();

  if (
    dejariaSinAdministradores({
      rolActual: rolSeguro(actual.rol),
      quedaActivo: false,
      rolNuevo: null,
      administradoresActivos: administradores,
    })
  ) {
    throw new ErrorConflicto(MENSAJE_ULTIMO_ADMIN);
  }

  await prisma.usuario.delete({ where: { id } });
};

/** Registra el último acceso correcto (no impide el login si falla). */
export const registrarAcceso = async (id: string): Promise<void> => {
  await prisma.usuario.update({
    where: { id },
    data: { ultimoAcceso: new Date() },
  });
};

/**
 * Recupera el acceso de administrador si el sistema quedó sin ninguno.
 *
 * Puede pasar al migrar desde la configuración antigua (`USUARIOS_JSON`), que
 * no tenía roles: todas las filas llegan como `FUNCIONARIO`. En ese caso se
 * promueve al **funcionario más antiguo** (el primero dado de alta), que es
 * una decisión determinística y no depende de quién inicie sesión.
 *
 * Devuelve el ID promovido, o `null` si no hacía falta.
 */
export const asegurarAdministradorInicial = async (): Promise<string | null> => {
  const administradores = await prisma.usuario.count({
    where: { rol: "ADMIN", activo: true },
  });

  if (administradores > 0) return null;

  const primero = await prisma.usuario.findFirst({
    where: { activo: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!primero) return null;

  await prisma.usuario.update({
    where: { id: primero.id },
    data: { rol: "ADMIN" },
  });

  return primero.id;
};
