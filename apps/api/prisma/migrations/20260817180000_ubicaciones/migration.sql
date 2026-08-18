-- Ubicaciones físicas, saldos por ubicación y putaway. Validar deja el stock
-- en el muelle; ubicar exige confirmar el destino. No se usa ubicacion_interna
-- como fuente de verdad.

CREATE TYPE "UbicacionTipo" AS ENUM ('ZONA', 'PASILLO', 'RACK', 'NIVEL', 'POSICION', 'OTRO');
CREATE TYPE "UbicacionFuncion" AS ENUM ('RECEPCION', 'CUARENTENA', 'ALMACENAMIENTO', 'PICKING', 'KITTING', 'DESPACHO', 'DEVOLUCION', 'RECHAZADO');
CREATE TYPE "UbicacionEstado" AS ENUM ('ACTIVA', 'INACTIVA', 'BLOQUEADA', 'MANTENIMIENTO');
CREATE TYPE "InventoryMovimientoTipo" AS ENUM ('RECEPCION', 'PUTAWAY', 'REUBICACION', 'AJUSTE');
CREATE TYPE "PutawayEstado" AS ENUM ('PENDIENTE', 'COMPLETADO', 'ANULADO');

CREATE TABLE "ubicaciones" (
    "id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "parent_id" UUID,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "UbicacionTipo" NOT NULL,
    "funcion" "UbicacionFuncion" NOT NULL,
    "estado" "UbicacionEstado" NOT NULL DEFAULT 'ACTIVA',
    "capacidad_peso_kg" DECIMAL(14,3),
    "capacidad_volumen" DECIMAL(14,3),
    "capacidad_unidades" DECIMAL(14,3),
    "zona_temperatura" TEXT,
    "permite_alimentos" BOOLEAN NOT NULL DEFAULT true,
    "permite_medicamentos" BOOLEAN NOT NULL DEFAULT true,
    "permite_ropa" BOOLEAN NOT NULL DEFAULT true,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ubicaciones_acopio_id_codigo_key" ON "ubicaciones"("acopio_id", "codigo");
CREATE INDEX "ubicaciones_acopio_id_estado_idx" ON "ubicaciones"("acopio_id", "estado");
CREATE INDEX "ubicaciones_acopio_id_funcion_idx" ON "ubicaciones"("acopio_id", "funcion");
CREATE INDEX "ubicaciones_parent_id_idx" ON "ubicaciones"("parent_id");

ALTER TABLE "ubicaciones" ADD CONSTRAINT "ubicaciones_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ubicaciones" ADD CONSTRAINT "ubicaciones_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "inventory_balances" (
    "id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "ubicacion_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_balances_inventory_item_id_ubicacion_id_key" ON "inventory_balances"("inventory_item_id", "ubicacion_id");
CREATE INDEX "inventory_balances_ubicacion_id_idx" ON "inventory_balances"("ubicacion_id");

ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "putaways" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "estado" "PutawayEstado" NOT NULL DEFAULT 'PENDIENTE',
    "created_by_id" UUID NOT NULL,
    "confirmed_by_id" UUID,
    "confirmed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "putaways_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "putaways_organization_id_codigo_key" ON "putaways"("organization_id", "codigo");
CREATE INDEX "putaways_acopio_id_estado_idx" ON "putaways"("acopio_id", "estado");
CREATE INDEX "putaways_inventory_item_id_idx" ON "putaways"("inventory_item_id");

ALTER TABLE "putaways" ADD CONSTRAINT "putaways_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "putaways" ADD CONSTRAINT "putaways_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "putaways" ADD CONSTRAINT "putaways_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "putaways" ADD CONSTRAINT "putaways_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "putaways" ADD CONSTRAINT "putaways_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "putaway_lineas" (
    "id" UUID NOT NULL,
    "putaway_id" UUID NOT NULL,
    "origen_ubicacion_id" UUID NOT NULL,
    "destino_ubicacion_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "estado" "PutawayEstado" NOT NULL DEFAULT 'PENDIENTE',
    "confirmed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "putaway_lineas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "putaway_lineas_putaway_id_idx" ON "putaway_lineas"("putaway_id");

ALTER TABLE "putaway_lineas" ADD CONSTRAINT "putaway_lineas_putaway_id_fkey" FOREIGN KEY ("putaway_id") REFERENCES "putaways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "putaway_lineas" ADD CONSTRAINT "putaway_lineas_origen_ubicacion_id_fkey" FOREIGN KEY ("origen_ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "putaway_lineas" ADD CONSTRAINT "putaway_lineas_destino_ubicacion_id_fkey" FOREIGN KEY ("destino_ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_movimientos" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "tipo" "InventoryMovimientoTipo" NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "origen_ubicacion_id" UUID,
    "destino_ubicacion_id" UUID,
    "putaway_id" UUID,
    "usuario_id" UUID NOT NULL,
    "observaciones" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movimientos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_movimientos_organization_id_codigo_key" ON "inventory_movimientos"("organization_id", "codigo");
CREATE INDEX "inventory_movimientos_inventory_item_id_created_at_idx" ON "inventory_movimientos"("inventory_item_id", "created_at");
CREATE INDEX "inventory_movimientos_acopio_id_created_at_idx" ON "inventory_movimientos"("acopio_id", "created_at");

ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_origen_ubicacion_id_fkey" FOREIGN KEY ("origen_ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_destino_ubicacion_id_fkey" FOREIGN KEY ("destino_ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_putaway_id_fkey" FOREIGN KEY ("putaway_id") REFERENCES "putaways"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
