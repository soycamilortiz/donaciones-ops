-- CreateEnum
CREATE TYPE "DonacionImagenEstado" AS ENUM ('PENDIENTE', 'PROCESANDO', 'PROCESADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "categoria" TEXT,
    "ean" TEXT,
    "alias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donacion_imagenes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID,
    "subida_por_id" UUID NOT NULL,
    "blob_url" TEXT NOT NULL,
    "blob_pathname" TEXT NOT NULL,
    "estado" "DonacionImagenEstado" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "texto_ocr" TEXT,
    "confianza" DOUBLE PRECISION,
    "producto_id" UUID,
    "procesada_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donacion_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_ean_key" ON "productos"("ean");

-- CreateIndex
CREATE INDEX "productos_marca_idx" ON "productos"("marca");

-- CreateIndex
CREATE UNIQUE INDEX "donacion_imagenes_blob_pathname_key" ON "donacion_imagenes"("blob_pathname");

-- CreateIndex
CREATE INDEX "donacion_imagenes_organization_id_estado_idx" ON "donacion_imagenes"("organization_id", "estado");

-- CreateIndex
CREATE INDEX "donacion_imagenes_estado_idx" ON "donacion_imagenes"("estado");

-- AddForeignKey
ALTER TABLE "donacion_imagenes" ADD CONSTRAINT "donacion_imagenes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donacion_imagenes" ADD CONSTRAINT "donacion_imagenes_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donacion_imagenes" ADD CONSTRAINT "donacion_imagenes_subida_por_id_fkey" FOREIGN KEY ("subida_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donacion_imagenes" ADD CONSTRAINT "donacion_imagenes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

