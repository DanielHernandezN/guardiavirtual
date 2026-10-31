/**
 * Funcionarios por terminal — Guardia Virtual
 * ───────────────────────────────────────────
 * Sirve para el **alta del primer administrador** y para emergencias (por
 * ejemplo, si nadie recuerda la contraseña de administrador). El uso diario
 * se hace desde el panel: `/dashboard/usuarios`.
 *
 * Uso:
 *   npm run usuarios -- listar
 *   npm run usuarios -- crear --id daniel --nombre "Daniel Hernández" --grado "Sgto. 1ro." --rol ADMIN
 *   npm run usuarios -- importar
 *   npm run usuarios -- clave --id daniel
 *   npm run usuarios -- rol --id daniel --rol ADMIN
 *   npm run usuarios -- estado --id daniel --estado inactivo
 *
 * La contraseña se pide por teclado (no se escribe en el comando, para que no
 * quede en el historial de la terminal).
 *
 * Las variables de entorno se cargan de `.env` y `.env.local`, igual que en la
 * aplicación; para producción se puede apuntar `DATABASE_URL` a PostgreSQL
 * antes de ejecutar el script.
 */

import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

/** Carga un archivo `.env` sin dependencias externas (no pisa lo ya definido). */
const cargarEnv = (archivo: string): void => {
  if (!existsSync(archivo)) return;

  for (const linea of readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;

    const separador = limpia.indexOf("=");
    if (separador === -1) continue;

    const clave = limpia.slice(0, separador).trim();
    let valor = limpia.slice(separador + 1).trim();

    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    if (!(clave in process.env)) {
      process.env[clave] = valor;
    }
  }
};

cargarEnv(".env");
cargarEnv(".env.local");

// Se importan después de cargar el entorno: Prisma lee DATABASE_URL al crearse.
const { prisma } = await import("../lib/db");
const { hashPassword } = await import("../lib/sesion");
const {
  dejariaSinAdministradores,
  MENSAJE_ULTIMO_ADMIN,
  normalizarIdUsuario,
  PASSWORD_MINIMA,
} = await import("../lib/usuarios");
const { contarAdministradoresActivos } = await import("../lib/usuarios-db");

type Args = Record<string, string>;

/** Convierte `["--id","daniel","--rol","ADMIN"]` en `{id:"daniel", rol:"ADMIN"}`. */
const leerArgs = (argv: string[]): Args => {
  const args: Args = {};

  for (let i = 0; i < argv.length; i++) {
    const actual = argv[i];

    if (!actual.startsWith("--")) continue;

    const clave = actual.slice(2);
    const siguiente = argv[i + 1];

    if (siguiente && !siguiente.startsWith("--")) {
      args[clave] = siguiente;
      i++;
    } else {
      args[clave] = "true";
    }
  }

  return args;
};

/** Lee una línea visible por teclado. */
const preguntar = async (texto: string): Promise<string> => {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    return (await rl.question(texto)).trim();
  } finally {
    rl.close();
  }
};

/**
 * Lee una contraseña sin mostrarla en pantalla.
 * Si la terminal no admite modo crudo, cae a una lectura visible avisando.
 */
const preguntarOculto = async (texto: string): Promise<string> => {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    console.warn("(La terminal no permite ocultar la contraseña.)");
    return preguntar(texto);
  }

  stdout.write(texto);

  return new Promise((resolver) => {
    let valor = "";
    const anterior = stdin.isRaw;

    const limpiar = () => {
      stdin.setRawMode(anterior ?? false);
      stdin.pause();
      stdin.removeListener("data", alEscribir);
      stdout.write("\n");
    };

    const alEscribir = (buffer: Buffer) => {
      const texto2 = buffer.toString("utf8");

      for (const caracter of texto2) {
        if (caracter === "\r" || caracter === "\n") {
          limpiar();
          resolver(valor);
          return;
        }

        if (caracter === "\u0003") {
          // Ctrl+C
          limpiar();
          process.exit(1);
        }

        if (caracter === "\u007f" || caracter === "\b") {
          valor = valor.slice(0, -1);
          continue;
        }

        valor += caracter;
      }
    };

    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", alEscribir);
  });
};

const pedirPassword = async (): Promise<string> => {
  const clave = await preguntarOculto("Contraseña: ");

  if (clave.length < PASSWORD_MINIMA) {
    throw new Error(
      `La contraseña debe tener al menos ${PASSWORD_MINIMA} caracteres.`
    );
  }

  const repetida = await preguntarOculto("Repetir contraseña: ");

  if (clave !== repetida) {
    throw new Error("Las contraseñas no coinciden.");
  }

  return clave;
};

const pedirId = async (args: Args): Promise<string> => {
  const crudo = args.id ?? (await preguntar("ID del funcionario: "));
  const id = normalizarIdUsuario(crudo);

  if (!id) {
    throw new Error("El ID es obligatorio.");
  }

  return id;
};

const listar = async (): Promise<void> => {
  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { casos: true } } },
  });

  if (usuarios.length === 0) {
    console.log("No hay funcionarios dados de alta.");
    return;
  }

  console.table(
    usuarios.map((usuario) => ({
      ID: usuario.id,
      Nombre: usuario.nombre,
      Grado: usuario.grado ?? "",
      Rol: usuario.rol,
      Estado: usuario.activo ? "activo" : "sin acceso",
      Casos: usuario._count.casos,
      "Último acceso": usuario.ultimoAcceso
        ? usuario.ultimoAcceso.toISOString().slice(0, 16).replace("T", " ")
        : "nunca",
    }))
  );
};

const crear = async (args: Args): Promise<void> => {
  const id = await pedirId(args);
  const nombre = args.nombre ?? (await preguntar("Nombre completo: "));
  const grado = args.grado ?? (await preguntar("Grado (opcional): "));

  const existentes = await prisma.usuario.count();
  // El primer funcionario del sistema siempre es administrador.
  const rol =
    args.rol === "ADMIN" || args.rol === "FUNCIONARIO"
      ? args.rol
      : existentes === 0
      ? "ADMIN"
      : (await preguntar("Rol [FUNCIONARIO/ADMIN] (FUNCIONARIO): "))
          .toUpperCase() === "ADMIN"
      ? "ADMIN"
      : "FUNCIONARIO";

  if (!nombre.trim()) {
    throw new Error("El nombre es obligatorio.");
  }

  const existente = await prisma.usuario.findUnique({ where: { id } });

  if (existente) {
    throw new Error(`Ya existe un funcionario con el ID "${id}".`);
  }

  const password = await pedirPassword();

  await prisma.usuario.create({
    data: {
      id,
      nombre: nombre.trim(),
      grado: grado.trim() || null,
      rol,
      passwordHash: hashPassword(password),
      activo: true,
    },
  });

  console.log(`Funcionario "${nombre.trim()}" (${id}) creado como ${rol}.`);
};

/**
 * Importa los funcionarios de `USUARIOS_JSON` (formato antiguo).
 * El primero queda como administrador. No cambia contraseñas existentes:
 * volver a ejecutarlo solo actualiza nombre y grado.
 */
const importar = async (): Promise<void> => {
  const crudo = process.env.USUARIOS_JSON;

  if (!crudo) {
    throw new Error(
      "USUARIOS_JSON no está definida. Defínela en .env.local o crea el administrador con: npm run usuarios -- crear"
    );
  }

  const lista = JSON.parse(crudo) as Array<{
    id: string;
    nombre: string;
    grado?: string;
    password: string;
  }>;

  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error("USUARIOS_JSON no contiene funcionarios.");
  }

  let primero = true;

  for (const configurado of lista) {
    const id = normalizarIdUsuario(configurado.id);
    const rol = primero ? "ADMIN" : "FUNCIONARIO";
    primero = false;

    const existente = await prisma.usuario.findUnique({ where: { id } });

    if (existente) {
      await prisma.usuario.update({
        where: { id },
        data: {
          nombre: configurado.nombre.trim(),
          grado: configurado.grado?.trim() || null,
          rol,
        },
      });

      console.log(
        `Actualizado: ${id} (${rol}). La contraseña no se modificó.`
      );
      continue;
    }

    if (!configurado.password) {
      console.warn(`Omitido: ${id} no tiene contraseña en USUARIOS_JSON.`);
      continue;
    }

    await prisma.usuario.create({
      data: {
        id,
        nombre: configurado.nombre.trim(),
        grado: configurado.grado?.trim() || null,
        rol,
        passwordHash: hashPassword(configurado.password),
        activo: true,
      },
    });

    console.log(`Creado: ${id} (${rol}).`);
  }

  console.log(
    "Listo. Ya puede borrar USUARIOS_JSON del entorno: las credenciales viven en la base de datos."
  );
};

const cambiarClave = async (args: Args): Promise<void> => {
  const id = await pedirId(args);
  const existente = await prisma.usuario.findUnique({ where: { id } });

  if (!existente) {
    throw new Error(`No existe el funcionario "${id}".`);
  }

  const password = await pedirPassword();

  await prisma.usuario.update({
    where: { id },
    data: { passwordHash: hashPassword(password) },
  });

  console.log(`Contraseña de "${existente.nombre}" actualizada.`);
};

const cambiarRol = async (args: Args): Promise<void> => {
  const id = await pedirId(args);
  const rol = (args.rol ?? (await preguntar("Nuevo rol [ADMIN/FUNCIONARIO]: ")))
    .trim()
    .toUpperCase();

  if (rol !== "ADMIN" && rol !== "FUNCIONARIO") {
    throw new Error("El rol debe ser ADMIN o FUNCIONARIO.");
  }

  const actual = await prisma.usuario.findUnique({ where: { id } });

  if (!actual) {
    throw new Error(`No existe el funcionario "${id}".`);
  }

  const administradores = await contarAdministradoresActivos();

  if (
    dejariaSinAdministradores({
      rolActual: actual.rol === "ADMIN" ? "ADMIN" : "FUNCIONARIO",
      quedaActivo: actual.activo,
      rolNuevo: rol,
      administradoresActivos: administradores,
    })
  ) {
    throw new Error(MENSAJE_ULTIMO_ADMIN);
  }

  await prisma.usuario.update({ where: { id }, data: { rol } });
  console.log(`"${actual.nombre}" ahora tiene el rol ${rol}.`);
};

const cambiarEstado = async (args: Args): Promise<void> => {
  const id = await pedirId(args);
  const estado = (
    args.estado ?? (await preguntar("Estado [activo/inactivo]: "))
  )
    .trim()
    .toLowerCase();

  if (estado !== "activo" && estado !== "inactivo") {
    throw new Error("El estado debe ser activo o inactivo.");
  }

  const activo = estado === "activo";
  const actual = await prisma.usuario.findUnique({ where: { id } });

  if (!actual) {
    throw new Error(`No existe el funcionario "${id}".`);
  }

  if (!activo) {
    const administradores = await contarAdministradoresActivos();

    if (
      dejariaSinAdministradores({
        rolActual: actual.rol === "ADMIN" ? "ADMIN" : "FUNCIONARIO",
        quedaActivo: false,
        rolNuevo: actual.rol === "ADMIN" ? "ADMIN" : "FUNCIONARIO",
        administradoresActivos: administradores,
      })
    ) {
      throw new Error(MENSAJE_ULTIMO_ADMIN);
    }
  }

  await prisma.usuario.update({ where: { id }, data: { activo } });
  console.log(`"${actual.nombre}" quedó ${activo ? "activo" : "sin acceso"}.`);
};

const ayuda = (): void => {
  console.log(`
Funcionarios — Guardia Virtual

  npm run usuarios -- listar
  npm run usuarios -- crear [--id daniel] [--nombre "Nombre"] [--grado "Sgto. 1ro."] [--rol ADMIN]
  npm run usuarios -- importar
  npm run usuarios -- clave --id daniel
  npm run usuarios -- rol --id daniel --rol ADMIN
  npm run usuarios -- estado --id daniel --estado inactivo

Notas:
  · El primer funcionario del sistema queda como ADMIN automáticamente.
  · "importar" lee USUARIOS_JSON y crea los funcionarios que falten; el
    primero queda como ADMIN y no cambia contraseñas existentes.
  · El uso diario se hace en /dashboard/usuarios.
`);
};

const principal = async (): Promise<void> => {
  const [comando, ...resto] = process.argv.slice(2);
  const args = leerArgs(resto);

  switch (comando) {
    case "listar":
      await listar();
      break;
    case "crear":
      await crear(args);
      break;
    case "importar":
      await importar();
      break;
    case "clave":
      await cambiarClave(args);
      break;
    case "rol":
      await cambiarRol(args);
      break;
    case "estado":
      await cambiarEstado(args);
      break;
    default:
      ayuda();
      break;
  }
};

try {
  await principal();
} catch (error) {
  console.error(
    `\nError: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
