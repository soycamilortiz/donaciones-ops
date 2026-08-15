ALTER TABLE "inventory_items" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "inventory_items_acopio_id_is_active_idx" ON "inventory_items"("acopio_id", "is_active");
