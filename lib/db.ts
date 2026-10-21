import { PrismaClient } from "@prisma/client";

/**
 * Cliente de base de datos — Guardia Virtual
 * ─────────────────────────────────────────
 * Instancia única de Prisma. En desarrollo se reutiliza entre recargas
 * en caliente (HMR) para no abrir múltiples conexiones a SQLite.
 */

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
