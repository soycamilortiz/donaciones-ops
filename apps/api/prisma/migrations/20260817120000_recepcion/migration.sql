-- Recepción como evento físico. El catálogo gana SKU y reglas; el inventario
-- se estrecha después de validar. Confirmar una foto ya no es el alta de stock.

CREATE TYPE "RecepcionTipo" AS ENUM ('DONACION_INDIVIDUAL', 'DONACION_MASIVA', 'TRANSFERENCIA', 'COMPRA', 'DEVOLUCION', 'REUBICACION', 'OTRO');
CREATE TYPE "RecepcionPresentacion" AS ENUM ('SUELTA', 'CAJAS', 'BULTOS', 'PALLETS', 'CONTENEDORES', 'MIXTA');
CREATE TYPE "RecepcionEstado" AS ENUM ('BORRADOR', 'EN_RECEPCION', 'EN_INSPECCION', 'PENDIENTE_VALIDACION', 'VALIDADA', 'CERRADA', 'ANULADA');
CREATE TYPE "UnidadLogisticaTipo" AS ENUM ('PALLET', 'CAJA', 'BULTO', 'SACO', 'CONTENEDOR', 'CANECA', 'BOLSA', 'PAQUETE', 'OTRO');
CREATE TYPE "UnidadLogisticaEstado" AS ENUM ('RECIBIDA', 'ABIERTA', 'VACIA');
CREATE TYPE "RecepcionItemEstado" AS ENUM ('PENDIENTE_ID', 'IDENTIFICADA', 'INSPECCIONADA', 'VALIDADA');

ALTER TABLE "productos" ADD COLUMN "sku" TEXT;
ALTER TABLE "productos" ADD COLUMN "categoria_inventario" "InventoryCategoria" NOT NULL DEFAULT 'OTRO';
ALTER TABLE "productos" ADD COLUMN "unidad_base" "InventoryUnidad" NOT NULL DEFAULT 'UNIDAD';
ALTER TABLE "productos" ADD COLUMN "presentacion" TEXT;
ALTER TABLE "productos" ADD COLUMN "requiere_lote" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "productos" ADD COLUMN "requiere_vencimiento" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "productos" ADD COLUMN "es_perecedero" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "productos" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "productos" SET
  "categoria_inventario" = CASE
    WHEN "categoria" ILIKE '%alimento%' THEN 'ALIMENTOS_NO_PERECEDEROS'::"InventoryCategoria"
    WHEN "categoria" ILIKE '%bebida%' OR "categoria" ILIKE '%agua%' THEN 'AGUA'::"InventoryCategoria"
    WHEN "categoria" ILIKE '%aseo%' THEN 'ASEO_HIGIENE'::"InventoryCategoria"
    WHEN "categoria" ILIKE '%pañal%' OR "categoria" ILIKE '%panal%' THEN 'PANALES_BEBE'::"InventoryCategoria"
    WHEN "categoria" ILIKE '%salud%' OR "categoria" ILIKE '%medic%' THEN 'MEDICAMENTOS'::"InventoryCategoria"
    ELSE 'OTRO'::"InventoryCategoria"
  END,
  "requiere_lote" = CASE
    WHEN "categoria" ILIKE '%alimento%' OR "categoria" ILIKE '%salud%' OR "categoria" ILIKE '%medic%' OR "categoria" ILIKE '%bebida%' OR "categoria" ILIKE '%agua%' THEN true
    ELSE false
  END,
  "requiere_vencimiento" = CASE
    WHEN "categoria" ILIKE '%alimento%' OR "categoria" ILIKE '%salud%' OR "categoria" ILIKE '%medic%' OR "categoria" ILIKE '%bebida%' OR "categoria" ILIKE '%agua%' THEN true
    ELSE false
  END;

UPDATE "productos" p SET "sku" = n.sku
FROM (
  SELECT
    id,
    CASE
      WHEN "categoria" ILIKE '%alimento%' THEN 'ALI'
      WHEN "categoria" ILIKE '%bebida%' OR "categoria" ILIKE '%agua%' THEN 'AGU'
      WHEN "categoria" ILIKE '%aseo%' THEN 'ASE'
      WHEN "categoria" ILIKE '%salud%' OR "categoria" ILIKE '%medic%' THEN 'MED'
      ELSE 'OTR'
    END
    || '-'
    || LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY CASE
          WHEN "categoria" ILIKE '%alimento%' THEN 'ALI'
          WHEN "categoria" ILIKE '%bebida%' OR "categoria" ILIKE '%agua%' THEN 'AGU'
          WHEN "categoria" ILIKE '%aseo%' THEN 'ASE'
          WHEN "categoria" ILIKE '%salud%' OR "categoria" ILIKE '%medic%' THEN 'MED'
          ELSE 'OTR'
        END
        ORDER BY "created_at", "nombre"
      )::text,
      4,
      '0'
    ) AS sku
  FROM "productos"
) n
WHERE p.id = n.id;

ALTER TABLE "productos" ALTER COLUMN "sku" SET NOT NULL;
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");
CREATE INDEX "productos_is_active_idx" ON "productos"("is_active");

ALTER TABLE "inventory_items" ADD COLUMN "producto_id" UUID;
ALTER TABLE "inventory_items" ADD COLUMN "lote_id" UUID;
CREATE INDEX "inventory_items_acopio_id_producto_id_lote_id_idx" ON "inventory_items"("acopio_id", "producto_id", "lote_id");

ALTER TABLE "donacion_imagenes" ADD COLUMN "recepcion_item_id" UUID;
CREATE INDEX "donacion_imagenes_recepcion_item_id_idx" ON "donacion_imagenes"("recepcion_item_id");

CREATE TABLE "org_counters" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "kind" TEXT NOT NULL,
    "periodo" TEXT NOT NULL DEFAULT '',
    "siguiente" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_counters_org_kind_periodo_key"
  ON "org_counters" ("organization_id", "kind", "periodo")
  WHERE "organization_id" IS NOT NULL;
CREATE UNIQUE INDEX "org_counters_global_kind_periodo_key"
  ON "org_counters" ("kind", "periodo")
  WHERE "organization_id" IS NULL;

INSERT INTO "org_counters" ("id", "organization_id", "kind", "periodo", "siguiente", "updated_at")
SELECT gen_random_uuid(), NULL, 'SKU:' || t.prefix, '', MAX(t.n), NOW()
FROM (
  SELECT split_part("sku", '-', 1) AS prefix, CAST(split_part("sku", '-', 2) AS INTEGER) AS n
  FROM "productos"
  WHERE "sku" ~ '^[A-Z]{3}-[0-9]{4}$'
) t
GROUP BY t.prefix;

CREATE TABLE "recepciones" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "tipo" "RecepcionTipo" NOT NULL,
    "presentacion_fisica" "RecepcionPresentacion" NOT NULL,
    "estado" "RecepcionEstado" NOT NULL DEFAULT 'EN_RECEPCION',
    "recibida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "donante_nombre" TEXT,
    "donante_contacto" TEXT,
    "procedencia" TEXT,
    "transportista" TEXT,
    "vehiculo_placa" TEXT,
    "documento_transporte" TEXT,
    "observaciones" TEXT,
    "responsable_id" UUID NOT NULL,
    "validada_en" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recepciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recepciones_organization_id_codigo_key" ON "recepciones"("organization_id", "codigo");
CREATE INDEX "recepciones_organization_id_created_at_idx" ON "recepciones"("organization_id", "created_at");
CREATE INDEX "recepciones_acopio_id_idx" ON "recepciones"("acopio_id");
CREATE INDEX "recepciones_organization_id_estado_idx" ON "recepciones"("organization_id", "estado");

CREATE TABLE "unidades_logisticas" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nro_en_recepcion" INTEGER NOT NULL,
    "recepcion_id" UUID NOT NULL,
    "tipo" "UnidadLogisticaTipo" NOT NULL,
    "parent_id" UUID,
    "estado" "UnidadLogisticaEstado" NOT NULL DEFAULT 'RECIBIDA',
    "observaciones" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_logisticas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unidades_logisticas_recepcion_id_nro_en_recepcion_key" ON "unidades_logisticas"("recepcion_id", "nro_en_recepcion");
CREATE INDEX "unidades_logisticas_recepcion_id_idx" ON "unidades_logisticas"("recepcion_id");
CREATE INDEX "unidades_logisticas_codigo_idx" ON "unidades_logisticas"("codigo");

CREATE TABLE "lotes" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "codigo_origen" TEXT,
    "producto_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "vencimiento" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lotes_organization_id_codigo_key" ON "lotes"("organization_id", "codigo");
CREATE INDEX "lotes_producto_id_idx" ON "lotes"("producto_id");
CREATE INDEX "lotes_organization_id_idx" ON "lotes"("organization_id");

CREATE TABLE "recepcion_items" (
    "id" UUID NOT NULL,
    "recepcion_id" UUID NOT NULL,
    "unidad_logistica_id" UUID,
    "producto_id" UUID,
    "lote_id" UUID,
    "inventory_item_id" UUID,
    "cantidad_recibida" DECIMAL(14,3) NOT NULL,
    "cantidad_aprobada" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "cantidad_cuarentena" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "cantidad_rechazada" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "unidad" "InventoryUnidad" NOT NULL DEFAULT 'UNIDAD',
    "peso_kg" DECIMAL(14,3),
    "estado_linea" "RecepcionItemEstado" NOT NULL DEFAULT 'PENDIENTE_ID',
    "observaciones" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recepcion_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recepcion_items_recepcion_id_idx" ON "recepcion_items"("recepcion_id");
CREATE INDEX "recepcion_items_producto_id_idx" ON "recepcion_items"("producto_id");
CREATE INDEX "recepcion_items_unidad_logistica_id_idx" ON "recepcion_items"("unidad_logistica_id");

ALTER TABLE "org_counters" ADD CONSTRAINT "org_counters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "unidades_logisticas" ADD CONSTRAINT "unidades_logisticas_recepcion_id_fkey" FOREIGN KEY ("recepcion_id") REFERENCES "recepciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unidades_logisticas" ADD CONSTRAINT "unidades_logisticas_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "unidades_logisticas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lotes" ADD CONSTRAINT "lotes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recepcion_items" ADD CONSTRAINT "recepcion_items_recepcion_id_fkey" FOREIGN KEY ("recepcion_id") REFERENCES "recepciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recepcion_items" ADD CONSTRAINT "recepcion_items_unidad_logistica_id_fkey" FOREIGN KEY ("unidad_logistica_id") REFERENCES "unidades_logisticas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recepcion_items" ADD CONSTRAINT "recepcion_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recepcion_items" ADD CONSTRAINT "recepcion_items_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recepcion_items" ADD CONSTRAINT "recepcion_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "donacion_imagenes" ADD CONSTRAINT "donacion_imagenes_recepcion_item_id_fkey" FOREIGN KEY ("recepcion_item_id") REFERENCES "recepcion_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
