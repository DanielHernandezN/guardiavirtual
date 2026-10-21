-- CreateTable
CREATE TABLE "Caso" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Borrador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "secciones" TEXT NOT NULL DEFAULT '[]',
    "texto" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "generadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoEn" DATETIME,
    CONSTRAINT "Borrador_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Caso_usuarioId_createdAt_idx" ON "Caso"("usuarioId", "createdAt");

-- CreateIndex
CREATE INDEX "Caso_estado_idx" ON "Caso"("estado");

-- CreateIndex
CREATE INDEX "Borrador_casoId_generadoEn_idx" ON "Borrador"("casoId", "generadoEn");
