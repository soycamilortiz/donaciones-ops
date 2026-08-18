-- Kits (BOM), demandas y reservas. La reserva compromete inventario por
-- lote/ubicación (FEFO) sin mover stock físico. Baja lógica: isActive.

CREATE TYPE "DemandaPrioridad" AS ENUM ('CRITICA', 'ALTA', 'MEDIA', 'BAJA');
CREATE TYPE "DemandaEstado" AS ENUM ('ABIERTA', 'PARCIAL', 'CUBIERTA', 'CANCELADA', 'CERRADA');
CREATE TYPE "DemandaItemTipo" AS ENUM ('KIT', 'PRODUCTO');
CREATE TYPE "ReservaEstado" AS ENUM ('PRE_RESERVA', 'RESERVADA', 'LIBERADA', 'CANCELADA', 'CONSUMIDA');

CREATE TABLE "kits" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kits_organization_id_codigo_key" ON "kits"("organization_id", "codigo");
CREATE INDEX "kits_organization_id_is_active_idx" ON "kits"("organization_id", "is_active");

ALTER TABLE "kits" ADD CONSTRAINT "kits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "kit_componentes" (
    "id" UUID NOT NULL,
    "kit_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kit_componentes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kit_componentes_kit_id_producto_id_key" ON "kit_componentes"("kit_id", "producto_id");
CREATE INDEX "kit_componentes_producto_id_idx" ON "kit_componentes"("producto_id");

ALTER TABLE "kit_componentes" ADD CONSTRAINT "kit_componentes_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kit_componentes" ADD CONSTRAINT "kit_componentes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "demandas" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "destino_nombre" TEXT NOT NULL,
    "destino_municipio" TEXT,
    "destino_departamento" TEXT,
    "prioridad" "DemandaPrioridad" NOT NULL DEFAULT 'MEDIA',
    "estado" "DemandaEstado" NOT NULL DEFAULT 'ABIERTA',
    "fecha_requerida" DATE,
    "poblacion_afectada" INTEGER,
    "tipo_emergencia" TEXT,
    "observaciones" TEXT,
    "created_by_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demandas_organization_id_codigo_key" ON "demandas"("organization_id", "codigo");
CREATE INDEX "demandas_organization_id_estado_idx" ON "demandas"("organization_id", "estado");
CREATE INDEX "demandas_acopio_id_prioridad_idx" ON "demandas"("acopio_id", "prioridad");

ALTER TABLE "demandas" ADD CONSTRAINT "demandas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "demanda_items" (
    "id" UUID NOT NULL,
    "demanda_id" UUID NOT NULL,
    "tipo" "DemandaItemTipo" NOT NULL,
    "kit_id" UUID,
    "producto_id" UUID,
    "cantidad_solicitada" DECIMAL(14,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demanda_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "demanda_items_demanda_id_idx" ON "demanda_items"("demanda_id");

ALTER TABLE "demanda_items" ADD CONSTRAINT "demanda_items_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demanda_items" ADD CONSTRAINT "demanda_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demanda_items" ADD CONSTRAINT "demanda_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "reservas" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "demanda_id" UUID NOT NULL,
    "demanda_item_id" UUID NOT NULL,
    "kit_id" UUID,
    "estado" "ReservaEstado" NOT NULL DEFAULT 'PRE_RESERVA',
    "cantidad" DECIMAL(14,3) NOT NULL,
    "observaciones" TEXT,
    "created_by_id" UUID NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reservas_organization_id_codigo_key" ON "reservas"("organization_id", "codigo");
CREATE INDEX "reservas_demanda_id_estado_idx" ON "reservas"("demanda_id", "estado");
CREATE INDEX "reservas_acopio_id_estado_idx" ON "reservas"("acopio_id", "estado");

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_demanda_id_fkey" FOREIGN KEY ("demanda_id") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_demanda_item_id_fkey" FOREIGN KEY ("demanda_item_id") REFERENCES "demanda_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "reserva_items" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad_requerida" DECIMAL(14,3) NOT NULL,
    "cantidad_asignada" DECIMAL(14,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserva_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reserva_items_reserva_id_idx" ON "reserva_items"("reserva_id");
CREATE INDEX "reserva_items_producto_id_idx" ON "reserva_items"("producto_id");

ALTER TABLE "reserva_items" ADD CONSTRAINT "reserva_items_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reserva_items" ADD CONSTRAINT "reserva_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "reserva_asignaciones" (
    "id" UUID NOT NULL,
    "reserva_item_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "ubicacion_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserva_asignaciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reserva_asignaciones_reserva_item_id_idx" ON "reserva_asignaciones"("reserva_item_id");
CREATE INDEX "reserva_asignaciones_inventory_item_id_ubicacion_id_idx" ON "reserva_asignaciones"("inventory_item_id", "ubicacion_id");

ALTER TABLE "reserva_asignaciones" ADD CONSTRAINT "reserva_asignaciones_reserva_item_id_fkey" FOREIGN KEY ("reserva_item_id") REFERENCES "reserva_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reserva_asignaciones" ADD CONSTRAINT "reserva_asignaciones_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reserva_asignaciones" ADD CONSTRAINT "reserva_asignaciones_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
