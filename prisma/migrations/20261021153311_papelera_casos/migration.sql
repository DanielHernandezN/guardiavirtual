-- AlterTable
ALTER TABLE "Caso" ADD COLUMN "eliminadoEn" DATETIME;

-- CreateIndex
CREATE INDEX "Caso_eliminadoEn_idx" ON "Caso"("eliminadoEn");
