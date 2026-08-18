-- Instancias de kit (armar desde reserva), control y consolidación.
-- Palletización física (PAL-DESP) queda para la siguiente etapa.

CREATE TYPE "KitInstanciaEstado" AS ENUM ('ARMADO', 'EN_CONTROL', 'APROBADO', 'OBSERVADO', 'RECHAZADO', 'CONSOLIDADO');
CREATE TYPE "ControlModo" AS ENUM ('TOTAL', 'MUESTREO');
CREATE TYPE "ControlLoteEstado" AS ENUM ('ABIERTO', 'REQUIERE_TOTAL', 'CERRADO');
CREATE TYPE "ControlResultado" AS ENUM ('PENDIENTE', 'APROBADO', 'OBSERVADO', 'RECHAZADO');
CREATE TYPE "ConsolidacionEstado" AS ENUM ('ABIERTA', 'LISTA', 'CERRADA');

ALTER TABLE "kits" ADD COLUMN "peso_kg_estimado" DECIMAL(14,3);
ALTER TABLE "kits" ADD COLUMN "alto_m_estimado" DECIMAL(8,3);
ALTER TABLE "kits" ADD COLUMN "es_critico" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "kit_instancias" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "demanda_id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "kit_id" UUID NOT NULL,
    "estado" "KitInstanciaEstado" NOT NULL DEFAULT 'ARMADO',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kit_instancias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kit_instancias_organization_id_codigo_key" ON "kit_instancias"("organization_id", "codigo");
CREATE INDEX "kit_instancias_reserva_id_estado_idx" ON "kit_instancias"("reserva_id", "estado");
CREATE INDEX "kit_instancias_demanda_id_estado_idx" ON "kit_instancias"("demanda_id", "estado");

ALTER TABLE "kit_instancias" ADD CONSTRAINT "kit_instancias_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kit_instancias" ADD CONSTRAINT "kit_instancias_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kit_instancias" ADD CONSTRAINT "kit_instancias_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kit_instancias" ADD CONSTRAINT "kit_instancias_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kit_instancias" ADD CONSTRAINT "kit_instancias_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "kit_instancia_items" (
    "id" UUID NOT NULL,
    "kit_instancia_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "inventory_item_id" UUID,
    "lote_codigo" TEXT,
    "vencimiento" DATE,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kit_instancia_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kit_instancia_items_kit_instancia_id_idx" ON "kit_instancia_items"("kit_instancia_id");
CREATE INDEX "kit_instancia_items_producto_id_idx" ON "kit_instancia_items"("producto_id");
CREATE INDEX "kit_instancia_items_lote_codigo_idx" ON "kit_instancia_items"("lote_codigo");

ALTER TABLE "kit_instancia_items" ADD CONSTRAINT "kit_instancia_items_kit_instancia_id_fkey" FOREIGN KEY ("kit_instancia_id") REFERENCES "kit_instancias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kit_instancia_items" ADD CONSTRAINT "kit_instancia_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kit_instancia_items" ADD CONSTRAINT "kit_instancia_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "control_lotes" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "demanda_id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "modo" "ControlModo" NOT NULL DEFAULT 'MUESTREO',
    "muestra_objetivo" INTEGER NOT NULL,
    "umbral_defecto" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "estado" "ControlLoteEstado" NOT NULL DEFAULT 'ABIERTO',
    "created_by_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_lotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "control_lotes_organization_id_codigo_key" ON "control_lotes"("organization_id", "codigo");
CREATE INDEX "control_lotes_reserva_id_estado_idx" ON "control_lotes"("reserva_id", "estado");

ALTER TABLE "control_lotes" ADD CONSTRAINT "control_lotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "control_lotes" ADD CONSTRAINT "control_lotes_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "control_lotes" ADD CONSTRAINT "control_lotes_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "control_lotes" ADD CONSTRAINT "control_lotes_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "control_lotes" ADD CONSTRAINT "control_lotes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "control_inspecciones" (
    "id" UUID NOT NULL,
    "control_lote_id" UUID NOT NULL,
    "kit_instancia_id" UUID NOT NULL,
    "resultado" "ControlResultado" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "inspeccionado_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_inspecciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "control_inspecciones_control_lote_id_kit_instancia_id_key" ON "control_inspecciones"("control_lote_id", "kit_instancia_id");
CREATE INDEX "control_inspecciones_kit_instancia_id_idx" ON "control_inspecciones"("kit_instancia_id");

ALTER TABLE "control_inspecciones" ADD CONSTRAINT "control_inspecciones_control_lote_id_fkey" FOREIGN KEY ("control_lote_id") REFERENCES "control_lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "control_inspecciones" ADD CONSTRAINT "control_inspecciones_kit_instancia_id_fkey" FOREIGN KEY ("kit_instancia_id") REFERENCES "kit_instancias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "consolidaciones" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "demanda_id" UUID NOT NULL,
    "destino_nombre" TEXT NOT NULL,
    "estado" "ConsolidacionEstado" NOT NULL DEFAULT 'ABIERTA',
    "kit_peso_kg" DECIMAL(14,3) NOT NULL DEFAULT 20,
    "pallet_peso_max_kg" DECIMAL(14,3) NOT NULL DEFAULT 800,
    "kit_alto_m" DECIMAL(8,3),
    "pallet_alto_max_m" DECIMAL(8,3),
    "created_by_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consolidaciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consolidaciones_organization_id_codigo_key" ON "consolidaciones"("organization_id", "codigo");
CREATE INDEX "consolidaciones_demanda_id_estado_idx" ON "consolidaciones"("demanda_id", "estado");

ALTER TABLE "consolidaciones" ADD CONSTRAINT "consolidaciones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consolidaciones" ADD CONSTRAINT "consolidaciones_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consolidaciones" ADD CONSTRAINT "consolidaciones_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consolidaciones" ADD CONSTRAINT "consolidaciones_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "consolidacion_kits" (
    "id" UUID NOT NULL,
    "consolidacion_id" UUID NOT NULL,
    "kit_instancia_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consolidacion_kits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "consolidacion_kits_kit_instancia_id_key" ON "consolidacion_kits"("kit_instancia_id");
CREATE INDEX "consolidacion_kits_consolidacion_id_idx" ON "consolidacion_kits"("consolidacion_id");

ALTER TABLE "consolidacion_kits" ADD CONSTRAINT "consolidacion_kits_consolidacion_id_fkey" FOREIGN KEY ("consolidacion_id") REFERENCES "consolidaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consolidacion_kits" ADD CONSTRAINT "consolidacion_kits_kit_instancia_id_fkey" FOREIGN KEY ("kit_instancia_id") REFERENCES "kit_instancias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
