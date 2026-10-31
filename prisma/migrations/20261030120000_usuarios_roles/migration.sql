-- ─────────────────────────────────────────────────────────────
-- Funcionarios en la base de datos (roles y administración)
-- ─────────────────────────────────────────────────────────────
-- Las credenciales pasan a vivir solo en la tabla `Usuario`: el hash
-- `scrypt` se guarda de forma persistente y ya no se regenera en cada
-- arranque desde `USUARIOS_JSON`.
--
-- Se incluyen dos columnas que se habían aplicado con `prisma db push`
-- (motor documental, Fase 12) y que faltaban en el historial de
-- migraciones; así el historial vuelve a coincidir con la base local.

-- Fase 12: metadatos del documento de origen y de la plantilla usada.
ALTER TABLE "Caso" ADD COLUMN "documento" TEXT;
ALTER TABLE "Borrador" ADD COLUMN "plantilla" TEXT;

-- Administración de funcionarios.
ALTER TABLE "Usuario" ADD COLUMN "grado" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "rol" TEXT NOT NULL DEFAULT 'FUNCIONARIO';
ALTER TABLE "Usuario" ADD COLUMN "ultimoAcceso" DATETIME;

CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");
