#!/usr/bin/env node
/**
 * Cambio de proveedor de base de datos — Guardia Virtual
 * ─────────────────────────────────────────────────────
 * El proyecto usa **SQLite** en desarrollo (archivo local, sin infraestructura)
 * y **PostgreSQL** en producción (Vercel no permite escribir en disco).
 *
 * Prisma no admite el proveedor como variable de entorno, así que este
 * script reescribe la línea `provider` de `prisma/schema.prisma`:
 *
 *   node scripts/proveedor-db.mjs sqlite
 *   node scripts/proveedor-db.mjs postgresql
 *
 * Uso típico:
 *   - Local:      `npm run db:use:sqlite`
 *   - Producción: `npm run db:use:postgres` (y luego `npm run db:deploy`)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROVEEDORES = ["sqlite", "postgresql"];

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const rutaEsquema = join(raiz, "prisma", "schema.prisma");

const solicitado = process.argv[2]?.trim().toLowerCase();

if (!solicitado || !PROVEEDORES.includes(solicitado)) {
  console.error(
    `Uso: node scripts/proveedor-db.mjs <${PROVEEDORES.join("|")}>\n` +
      `Proveedor actual: ${ leerProveedor() }`
  );
  process.exit(1);
}

const actual = leerProveedor();

if (actual === solicitado) {
  console.log(`El proveedor ya es "${solicitado}". No hay cambios.`);
  process.exit(0);
}

const esquema = readFileSync(rutaEsquema, "utf8");
const actualizado = esquema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")[^"]+(")/s,
  `$1${solicitado}$2`
);

writeFileSync(rutaEsquema, actualizado, "utf8");

console.log(`Proveedor de base de datos cambiado: "${actual}" → "${solicitado}".`);
console.log(
  solicitado === "postgresql"
    ? 'Recuerde: la URL de producción va en DATABASE_URL (Postgres) y luego ejecute `npm run db:deploy`.'
    : 'Recuerde: la URL local va en DATABASE_URL (SQLite) y luego ejecute `npm run db:migrate`.'
);

/** Lee el proveedor configurado en el esquema de Prisma. */
function leerProveedor() {
  const esquema = readFileSync(rutaEsquema, "utf8");
  const coincidencia = esquema.match(
    /datasource\s+db\s*\{[^}]*?provider\s*=\s*"([^"]+)"/s
  );
  return coincidencia?.[1] ?? "desconocido";
}
