-- Picking físico: kits pendientes, ubicación origen por línea y movimiento PICKING.

ALTER TYPE "KitInstanciaEstado" ADD VALUE IF NOT EXISTS 'PENDIENTE_PICK';
ALTER TYPE "InventoryMovimientoTipo" ADD VALUE IF NOT EXISTS 'PICKING';

ALTER TABLE "kit_instancias" ADD COLUMN IF NOT EXISTS "zona_kitting_ubicacion_id" UUID;

ALTER TABLE "kit_instancia_items" ADD COLUMN IF NOT EXISTS "origen_ubicacion_id" UUID;
ALTER TABLE "kit_instancia_items" ADD COLUMN IF NOT EXISTS "pick_confirmado_at" TIMESTAMP(3);

ALTER TABLE "inventory_movimientos" ADD COLUMN IF NOT EXISTS "kit_instancia_item_id" UUID;

CREATE INDEX IF NOT EXISTS "kit_instancia_items_origen_ubicacion_id_idx" ON "kit_instancia_items"("origen_ubicacion_id");

ALTER TABLE "kit_instancias" ADD CONSTRAINT "kit_instancias_zona_kitting_ubicacion_id_fkey"
  FOREIGN KEY ("zona_kitting_ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kit_instancia_items" ADD CONSTRAINT "kit_instancia_items_origen_ubicacion_id_fkey"
  FOREIGN KEY ("origen_ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_kit_instancia_item_id_fkey"
  FOREIGN KEY ("kit_instancia_item_id") REFERENCES "kit_instancia_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
