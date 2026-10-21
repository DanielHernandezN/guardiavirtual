-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Conserva los casos ya guardados: se crea una fila de Usuario por cada
-- autor referenciado antes de activar la clave foránea.
INSERT INTO "Usuario" ("id", "nombre", "passwordHash", "activo", "createdAt", "updatedAt")
SELECT DISTINCT "usuarioId", "usuarioId", '', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Caso";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Caso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "tipoProcedimiento" TEXT,
    "especie" TEXT,
    "lugar" TEXT,
    "fecha" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "antecedentes" TEXT NOT NULL DEFAULT '{}',
    "usuarioId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Caso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Caso" ("antecedentes", "createdAt", "especie", "estado", "fecha", "id", "lugar", "tipoProcedimiento", "titulo", "updatedAt", "usuarioId") SELECT "antecedentes", "createdAt", "especie", "estado", "fecha", "id", "lugar", "tipoProcedimiento", "titulo", "updatedAt", "usuarioId" FROM "Caso";
DROP TABLE "Caso";
ALTER TABLE "new_Caso" RENAME TO "Caso";
CREATE INDEX "Caso_usuarioId_createdAt_idx" ON "Caso"("usuarioId", "createdAt");
CREATE INDEX "Caso_estado_idx" ON "Caso"("estado");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");
