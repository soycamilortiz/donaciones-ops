-- AlterEnum
ALTER TYPE "KitInstanciaEstado" ADD VALUE 'PALLETIZADO';

-- CreateEnum
CREATE TYPE "PlanPalletizacionEstado" AS ENUM ('BORRADOR', 'ACTIVO', 'CERRADO', 'CANCELADO');
CREATE TYPE "PalletDespachoEstado" AS ENUM ('CREADO', 'EN_CONSTRUCCION', 'COMPLETO', 'LISTO_PARA_DESPACHO', 'CARGADO', 'DESPACHADO', 'BLOQUEADO', 'CANCELADO');
CREATE TYPE "DespachoEstado" AS ENUM ('BORRADOR', 'EN_CARGA', 'LISTO', 'EN_RUTA', 'ENTREGADO', 'ANULADO');
CREATE TYPE "PalletDespachoItemTipo" AS ENUM ('KIT', 'PRODUCTO');

-- CreateTable
CREATE TABLE "planes_palletizacion" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "demanda_id" UUID NOT NULL,
    "consolidacion_id" UUID NOT NULL,
    "destino_nombre" TEXT NOT NULL,
    "estado" "PlanPalletizacionEstado" NOT NULL DEFAULT 'ACTIVO',
    "kit_peso_kg" DECIMAL(14,3) NOT NULL DEFAULT 20,
    "pallet_peso_max_kg" DECIMAL(14,3) NOT NULL DEFAULT 800,
    "kit_alto_m" DECIMAL(8,3),
    "pallet_alto_max_m" DECIMAL(8,3),
    "pallet_count" INTEGER NOT NULL,
    "kits_por_pallet" INTEGER NOT NULL,
    "created_by_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_palletizacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plan_pallet_slots" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kits_objetivo" INTEGER NOT NULL,
    "peso_teorico_kg" DECIMAL(14,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_pallet_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pallets_despacho" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "demanda_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "consolidacion_id" UUID NOT NULL,
    "despacho_id" UUID,
    "destino_nombre" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "estado" "PalletDespachoEstado" NOT NULL DEFAULT 'CREADO',
    "kits_objetivo" INTEGER NOT NULL,
    "peso_pallet_kg" DECIMAL(14,3) NOT NULL DEFAULT 25,
    "peso_neto_kg" DECIMAL(14,3),
    "peso_bruto_kg" DECIMAL(14,3),
    "alto_m" DECIMAL(8,3),
    "ancho_m" DECIMAL(8,3),
    "largo_m" DECIMAL(8,3),
    "finalizado_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pallets_despacho_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pallet_despacho_items" (
    "id" UUID NOT NULL,
    "pallet_despacho_id" UUID NOT NULL,
    "tipo" "PalletDespachoItemTipo" NOT NULL DEFAULT 'KIT',
    "kit_instancia_id" UUID,
    "producto_id" UUID,
    "cantidad" DECIMAL(14,3),
    "escaneado_at" TIMESTAMP(3),
    "escaneado_por_id" UUID,
    "retirado_at" TIMESTAMP(3),
    "retirado_motivo" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pallet_despacho_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "despachos" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "demanda_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "destino_nombre" TEXT NOT NULL,
    "estado" "DespachoEstado" NOT NULL DEFAULT 'BORRADOR',
    "vehiculo_placa" TEXT,
    "transportista" TEXT,
    "conductor_nombre" TEXT,
    "conductor_documento" TEXT,
    "documento_transporte" TEXT,
    "pallets_esperados" INTEGER NOT NULL,
    "salida_programada" TIMESTAMP(3),
    "salida_real" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "despachos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planes_palletizacion_consolidacion_id_key" ON "planes_palletizacion"("consolidacion_id");
CREATE UNIQUE INDEX "planes_palletizacion_organization_id_codigo_key" ON "planes_palletizacion"("organization_id", "codigo");
CREATE INDEX "planes_palletizacion_demanda_id_estado_idx" ON "planes_palletizacion"("demanda_id", "estado");

CREATE UNIQUE INDEX "plan_pallet_slots_plan_id_sequence_key" ON "plan_pallet_slots"("plan_id", "sequence");
CREATE INDEX "plan_pallet_slots_plan_id_idx" ON "plan_pallet_slots"("plan_id");

CREATE UNIQUE INDEX "pallets_despacho_slot_id_key" ON "pallets_despacho"("slot_id");
CREATE UNIQUE INDEX "pallets_despacho_organization_id_codigo_key" ON "pallets_despacho"("organization_id", "codigo");
CREATE INDEX "pallets_despacho_plan_id_estado_idx" ON "pallets_despacho"("plan_id", "estado");
CREATE INDEX "pallets_despacho_despacho_id_idx" ON "pallets_despacho"("despacho_id");

CREATE INDEX "pallet_despacho_items_pallet_despacho_id_is_active_idx" ON "pallet_despacho_items"("pallet_despacho_id", "is_active");
CREATE INDEX "pallet_despacho_items_kit_instancia_id_idx" ON "pallet_despacho_items"("kit_instancia_id");

CREATE UNIQUE INDEX "despachos_organization_id_codigo_key" ON "despachos"("organization_id", "codigo");
CREATE INDEX "despachos_demanda_id_estado_idx" ON "despachos"("demanda_id", "estado");
CREATE INDEX "despachos_plan_id_idx" ON "despachos"("plan_id");

-- AddForeignKey
ALTER TABLE "planes_palletizacion" ADD CONSTRAINT "planes_palletizacion_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "planes_palletizacion" ADD CONSTRAINT "planes_palletizacion_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "planes_palletizacion" ADD CONSTRAINT "planes_palletizacion_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "planes_palletizacion" ADD CONSTRAINT "planes_palletizacion_consolidacion_id_fkey" FOREIGN KEY ("consolidacion_id") REFERENCES "consolidaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "planes_palletizacion" ADD CONSTRAINT "planes_palletizacion_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "plan_pallet_slots" ADD CONSTRAINT "plan_pallet_slots_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_palletizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pallets_despacho" ADD CONSTRAINT "pallets_despacho_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pallets_despacho" ADD CONSTRAINT "pallets_despacho_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pallets_despacho" ADD CONSTRAINT "pallets_despacho_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pallets_despacho" ADD CONSTRAINT "pallets_despacho_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_palletizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pallets_despacho" ADD CONSTRAINT "pallets_despacho_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "plan_pallet_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pallets_despacho" ADD CONSTRAINT "pallets_despacho_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pallets_despacho" ADD CONSTRAINT "pallets_despacho_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pallet_despacho_items" ADD CONSTRAINT "pallet_despacho_items_pallet_despacho_id_fkey" FOREIGN KEY ("pallet_despacho_id") REFERENCES "pallets_despacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pallet_despacho_items" ADD CONSTRAINT "pallet_despacho_items_kit_instancia_id_fkey" FOREIGN KEY ("kit_instancia_id") REFERENCES "kit_instancias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pallet_despacho_items" ADD CONSTRAINT "pallet_despacho_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pallet_despacho_items" ADD CONSTRAINT "pallet_despacho_items_escaneado_por_id_fkey" FOREIGN KEY ("escaneado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "despachos" ADD CONSTRAINT "despachos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_palletizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
