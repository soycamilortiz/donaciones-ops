-- AlterTable
ALTER TABLE "donacion_imagenes" ADD COLUMN "nombre_detectado" TEXT;
ALTER TABLE "donacion_imagenes" ADD COLUMN "cantidad_detectada" DECIMAL(14,3);
ALTER TABLE "donacion_imagenes" ADD COLUMN "confirmada_en" TIMESTAMP(3);
ALTER TABLE "donacion_imagenes" ADD COLUMN "inventory_item_id" UUID;

-- AddForeignKey
ALTER TABLE "donacion_imagenes" ADD CONSTRAINT "donacion_imagenes_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
