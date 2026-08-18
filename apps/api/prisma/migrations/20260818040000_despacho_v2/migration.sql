-- AlterEnum KitInstanciaEstado
ALTER TYPE "KitInstanciaEstado" ADD VALUE IF NOT EXISTS 'DESPACHADO';

-- AlterEnum InventoryMovimientoTipo
ALTER TYPE "InventoryMovimientoTipo" ADD VALUE IF NOT EXISTS 'DESPACHO';

-- AlterEnum DespachoEstado (add new values)
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'PLANIFICADO';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'LISTO_PARA_CARGA';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'CARGANDO';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'CARGADO';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'DESPACHADO';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'EN_TRANSITO';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'PARCIAL';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'CANCELADO';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'RETENIDO';
ALTER TYPE "DespachoEstado" ADD VALUE IF NOT EXISTS 'DEVUELTO';

-- CreateEnum
CREATE TYPE "ViajeEstado" AS ENUM ('PLANIFICADO', 'CARGANDO', 'CARGADO', 'DESPACHADO', 'EN_TRANSITO', 'ENTREGADO', 'CANCELADO');
CREATE TYPE "CargaEstado" AS ENUM ('ABIERTA', 'CARGANDO', 'COMPLETA', 'CERRADA');
CREATE TYPE "CargaItemTipo" AS ENUM ('PALLET', 'CAJA', 'CONTENEDOR', 'PRODUCTO');

-- AlterTable despachos
ALTER TABLE "despachos" ADD COLUMN "prioridad" "DemandaPrioridad" NOT NULL DEFAULT 'MEDIA';
ALTER TABLE "despachos" ADD COLUMN "kits_esperados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "despachos" ADD COLUMN "pallets_despachados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "despachos" ADD COLUMN "kits_despachados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "despachos" ADD COLUMN "peso_total_kg" DECIMAL(14,3);
ALTER TABLE "despachos" ADD COLUMN "volumen_total_m3" DECIMAL(14,3);
ALTER TABLE "despachos" ADD COLUMN "es_parcial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "despachos" ADD COLUMN "observaciones" TEXT;

-- AlterTable inventory_movimientos
ALTER TABLE "inventory_movimientos" ADD COLUMN "despacho_id" UUID;

-- CreateTable transportistas
CREATE TABLE "transportistas" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "telefono" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transportistas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vehiculos" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo" TEXT,
    "capacidad_kg" DECIMAL(14,3),
    "capacidad_m3" DECIMAL(14,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conductores" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "telefono" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conductores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "viajes" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "despacho_id" UUID NOT NULL,
    "vehiculo_id" UUID,
    "transportista_id" UUID,
    "conductor_id" UUID,
    "vehiculo_placa" TEXT,
    "transportista_nombre" TEXT,
    "conductor_nombre" TEXT,
    "conductor_documento" TEXT,
    "estado" "ViajeEstado" NOT NULL DEFAULT 'PLANIFICADO',
    "pallets_esperados" INTEGER NOT NULL,
    "pallets_cargados" INTEGER NOT NULL DEFAULT 0,
    "peso_cargado_kg" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "salida_programada" TIMESTAMP(3),
    "salida_real" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "viajes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cargas" (
    "id" UUID NOT NULL,
    "viaje_id" UUID NOT NULL,
    "despacho_id" UUID NOT NULL,
    "estado" "CargaEstado" NOT NULL DEFAULT 'ABIERTA',
    "pallets_esperados" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cargas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carga_items" (
    "id" UUID NOT NULL,
    "carga_id" UUID NOT NULL,
    "tipo" "CargaItemTipo" NOT NULL DEFAULT 'PALLET',
    "pallet_despacho_id" UUID,
    "escaneado_at" TIMESTAMP(3),
    "escaneado_por_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carga_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "despacho_manifiestos" (
    "id" UUID NOT NULL,
    "despacho_id" UUID NOT NULL,
    "origen_nombre" TEXT NOT NULL,
    "destino_nombre" TEXT NOT NULL,
    "vehiculo_placa" TEXT,
    "conductor_nombre" TEXT,
    "transportista_nombre" TEXT,
    "pallets_count" INTEGER NOT NULL,
    "kits_count" INTEGER NOT NULL,
    "peso_kg" DECIMAL(14,3) NOT NULL,
    "volumen_m3" DECIMAL(14,3),
    "generado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "despacho_manifiestos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "despacho_checklists" (
    "id" UUID NOT NULL,
    "despacho_id" UUID NOT NULL,
    "carga_completa" BOOLEAN NOT NULL DEFAULT false,
    "pallets_identificados" BOOLEAN NOT NULL DEFAULT false,
    "peso_verificado" BOOLEAN NOT NULL DEFAULT false,
    "destino_confirmado" BOOLEAN NOT NULL DEFAULT false,
    "vehiculo_confirmado" BOOLEAN NOT NULL DEFAULT false,
    "conductor_confirmado" BOOLEAN NOT NULL DEFAULT false,
    "documentacion_completa" BOOLEAN NOT NULL DEFAULT false,
    "sellos_registrados" BOOLEAN NOT NULL DEFAULT false,
    "confirmado_at" TIMESTAMP(3),
    "confirmado_por_id" UUID,
    CONSTRAINT "despacho_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proof_of_delivery" (
    "id" UUID NOT NULL,
    "despacho_id" UUID NOT NULL,
    "received_by" TEXT,
    "receiver_document" TEXT,
    "cantidad_recibida" INTEGER,
    "cantidad_danada" INTEGER NOT NULL DEFAULT 0,
    "cantidad_faltante" INTEGER NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "firma_url" TEXT,
    "foto_url" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "entregado_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proof_of_delivery_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "vehiculos_organization_id_placa_key" ON "vehiculos"("organization_id", "placa");
CREATE INDEX "vehiculos_organization_id_is_active_idx" ON "vehiculos"("organization_id", "is_active");
CREATE UNIQUE INDEX "conductores_organization_id_documento_key" ON "conductores"("organization_id", "documento");
CREATE INDEX "conductores_organization_id_is_active_idx" ON "conductores"("organization_id", "is_active");
CREATE INDEX "transportistas_organization_id_is_active_idx" ON "transportistas"("organization_id", "is_active");
CREATE UNIQUE INDEX "viajes_organization_id_codigo_key" ON "viajes"("organization_id", "codigo");
CREATE INDEX "viajes_despacho_id_estado_idx" ON "viajes"("despacho_id", "estado");
CREATE UNIQUE INDEX "cargas_viaje_id_key" ON "cargas"("viaje_id");
CREATE INDEX "cargas_despacho_id_idx" ON "cargas"("despacho_id");
CREATE UNIQUE INDEX "carga_items_pallet_despacho_id_key" ON "carga_items"("pallet_despacho_id");
CREATE INDEX "carga_items_carga_id_is_active_idx" ON "carga_items"("carga_id", "is_active");
CREATE UNIQUE INDEX "despacho_manifiestos_despacho_id_key" ON "despacho_manifiestos"("despacho_id");
CREATE UNIQUE INDEX "despacho_checklists_despacho_id_key" ON "despacho_checklists"("despacho_id");
CREATE UNIQUE INDEX "proof_of_delivery_despacho_id_key" ON "proof_of_delivery"("despacho_id");
CREATE INDEX "inventory_movimientos_despacho_id_idx" ON "inventory_movimientos"("despacho_id");

-- ForeignKeys
ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transportistas" ADD CONSTRAINT "transportistas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conductores" ADD CONSTRAINT "conductores_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_transportista_id_fkey" FOREIGN KEY ("transportista_id") REFERENCES "transportistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_conductor_id_fkey" FOREIGN KEY ("conductor_id") REFERENCES "conductores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cargas" ADD CONSTRAINT "cargas_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cargas" ADD CONSTRAINT "cargas_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carga_items" ADD CONSTRAINT "carga_items_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "cargas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carga_items" ADD CONSTRAINT "carga_items_pallet_despacho_id_fkey" FOREIGN KEY ("pallet_despacho_id") REFERENCES "pallets_despacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carga_items" ADD CONSTRAINT "carga_items_escaneado_por_id_fkey" FOREIGN KEY ("escaneado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "despacho_manifiestos" ADD CONSTRAINT "despacho_manifiestos_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "despacho_checklists" ADD CONSTRAINT "despacho_checklists_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proof_of_delivery" ADD CONSTRAINT "proof_of_delivery_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
