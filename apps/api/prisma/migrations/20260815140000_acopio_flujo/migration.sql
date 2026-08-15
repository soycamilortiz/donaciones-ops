-- CreateEnum
CREATE TYPE "AcopioFlujo" AS ENUM ('RECIBIR', 'ENVIAR', 'AMBOS');

-- AlterTable
ALTER TABLE "acopios" ADD COLUMN "flujo" "AcopioFlujo" NOT NULL DEFAULT 'AMBOS';
