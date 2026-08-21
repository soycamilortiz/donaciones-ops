-- Transporte (TMS) y Entrega v1

-- Enum extensions (add values only; no UPDATE to new values in this migration)
ALTER TYPE "InventoryMovimientoTipo" ADD VALUE IF NOT EXISTS 'ENTREGA';
ALTER TYPE "InventoryMovimientoTipo" ADD VALUE IF NOT EXISTS 'DEVOLUCION';

ALTER TYPE "KitInstanciaEstado" ADD VALUE IF NOT EXISTS 'ENTREGADO';

ALTER TYPE "ViajeEstado" ADD VALUE IF NOT EXISTS 'ASIGNADO';
ALTER TYPE "ViajeEstado" ADD VALUE IF NOT EXISTS 'LISTO';
ALTER TYPE "ViajeEstado" ADD VALUE IF NOT EXISTS 'LLEGO_DESTINO';
ALTER TYPE "ViajeEstado" ADD VALUE IF NOT EXISTS 'RETORNADO';

-- New enums
CREATE TYPE "TransportistaTipo" AS ENUM ('EMPRESA', 'ONG', 'PUBLICO', 'VOLUNTARIO', 'INDEPENDIENTE', 'PROPIO');
CREATE TYPE "VehiculoEstado" AS ENUM ('DISPONIBLE', 'EN_USO', 'MANTENIMIENTO', 'INACTIVO');
CREATE TYPE "TransportEventTipo" AS ENUM ('SALIDA', 'LLEGADA_PARADA', 'SALIDA_PARADA', 'LLEGADA_DESTINO', 'INCIDENCIA', 'RETORNO', 'OTRO');
CREATE TYPE "ViajeParadaEstado" AS ENUM ('PENDIENTE', 'EN_RUTA', 'LLEGADA', 'DESCARGA', 'COMPLETADA');
CREATE TYPE "EntregaEstado" AS ENUM ('PENDIENTE', 'PARCIAL', 'COMPLETA', 'CON_DIFERENCIAS', 'RECHAZADA');

-- Transportista catalog extensions
ALTER TABLE "transportistas" ADD COLUMN "tipo" "TransportistaTipo" NOT NULL DEFAULT 'EMPRESA';
ALTER TABLE "transportistas" ADD COLUMN "nit" TEXT;
ALTER TABLE "transportistas" ADD COLUMN "contacto" TEXT;
ALTER TABLE "transportistas" ADD COLUMN "email" TEXT;

-- Vehiculo catalog extensions
ALTER TABLE "vehiculos" ADD COLUMN "transportista_id" UUID;
ALTER TABLE "vehiculos" ADD COLUMN "marca" TEXT;
ALTER TABLE "vehiculos" ADD COLUMN "modelo" TEXT;
ALTER TABLE "vehiculos" ADD COLUMN "num_ejes" INTEGER;
ALTER TABLE "vehiculos" ADD COLUMN "estado" "VehiculoEstado" NOT NULL DEFAULT 'DISPONIBLE';

ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_transportista_id_fkey"
  FOREIGN KEY ("transportista_id") REFERENCES "transportistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "vehiculos_transportista_id_idx" ON "vehiculos"("transportista_id");

-- Conductor catalog extensions
ALTER TABLE "conductores" ADD COLUMN "transportista_id" UUID;
ALTER TABLE "conductores" ADD COLUMN "licencia" TEXT;
ALTER TABLE "conductores" ADD COLUMN "tipo_licencia" TEXT;

ALTER TABLE "conductores" ADD CONSTRAINT "conductores_transportista_id_fkey"
  FOREIGN KEY ("transportista_id") REFERENCES "transportistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "conductores_transportista_id_idx" ON "conductores"("transportista_id");

-- Rutas (templates)
CREATE TABLE "rutas" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "created_by_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "rutas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ruta_paradas" (
  "id" UUID NOT NULL,
  "ruta_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ruta_paradas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "rutas" ADD CONSTRAINT "rutas_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rutas" ADD CONSTRAINT "rutas_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ruta_paradas" ADD CONSTRAINT "ruta_paradas_ruta_id_fkey"
  FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "rutas_organization_id_codigo_key" ON "rutas"("organization_id", "codigo");
CREATE INDEX "rutas_organization_id_is_active_idx" ON "rutas"("organization_id", "is_active");
CREATE UNIQUE INDEX "ruta_paradas_ruta_id_sequence_key" ON "ruta_paradas"("ruta_id", "sequence");
CREATE INDEX "ruta_paradas_ruta_id_is_active_idx" ON "ruta_paradas"("ruta_id", "is_active");

-- Viaje extensions
ALTER TABLE "viajes" ADD COLUMN "ruta_id" UUID;
ALTER TABLE "viajes" ADD COLUMN "origen_nombre" TEXT;
ALTER TABLE "viajes" ADD COLUMN "destino_nombre" TEXT;
ALTER TABLE "viajes" ADD COLUMN "kits_esperados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "viajes" ADD COLUMN "kits_cargados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "viajes" ADD COLUMN "volumen_m3" DECIMAL(14,3);
ALTER TABLE "viajes" ADD COLUMN "llegada_estimada" TIMESTAMP(3);
ALTER TABLE "viajes" ADD COLUMN "llegada_real" TIMESTAMP(3);
ALTER TABLE "viajes" ADD COLUMN "observaciones" TEXT;

ALTER TABLE "viajes" ADD CONSTRAINT "viajes_ruta_id_fkey"
  FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "viajes_organization_id_estado_idx" ON "viajes"("organization_id", "estado");

-- Viaje paradas y carga por parada
CREATE TABLE "viaje_paradas" (
  "id" UUID NOT NULL,
  "viaje_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "destino_nombre" TEXT,
  "estado" "ViajeParadaEstado" NOT NULL DEFAULT 'PENDIENTE',
  "llegada_at" TIMESTAMP(3),
  "salida_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "viaje_paradas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "viaje_parada_pallets" (
  "id" UUID NOT NULL,
  "viaje_parada_id" UUID NOT NULL,
  "pallet_despacho_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "viaje_parada_pallets_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "viaje_paradas" ADD CONSTRAINT "viaje_paradas_viaje_id_fkey"
  FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viaje_parada_pallets" ADD CONSTRAINT "viaje_parada_pallets_viaje_parada_id_fkey"
  FOREIGN KEY ("viaje_parada_id") REFERENCES "viaje_paradas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viaje_parada_pallets" ADD CONSTRAINT "viaje_parada_pallets_pallet_despacho_id_fkey"
  FOREIGN KEY ("pallet_despacho_id") REFERENCES "pallets_despacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "viaje_paradas_viaje_id_sequence_key" ON "viaje_paradas"("viaje_id", "sequence");
CREATE INDEX "viaje_paradas_viaje_id_is_active_idx" ON "viaje_paradas"("viaje_id", "is_active");
CREATE UNIQUE INDEX "viaje_parada_pallets_pallet_despacho_id_key" ON "viaje_parada_pallets"("pallet_despacho_id");
CREATE INDEX "viaje_parada_pallets_viaje_parada_id_is_active_idx" ON "viaje_parada_pallets"("viaje_parada_id", "is_active");

-- Transport events
CREATE TABLE "transport_events" (
  "id" UUID NOT NULL,
  "viaje_id" UUID NOT NULL,
  "tipo" "TransportEventTipo" NOT NULL,
  "fecha_hora" TIMESTAMP(3) NOT NULL,
  "ubicacion_nombre" TEXT,
  "observaciones" TEXT,
  "created_by_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "transport_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transport_events" ADD CONSTRAINT "transport_events_viaje_id_fkey"
  FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transport_events" ADD CONSTRAINT "transport_events_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "transport_events_viaje_id_fecha_hora_idx" ON "transport_events"("viaje_id", "fecha_hora");

-- Inventory movimientos: link to viaje
ALTER TABLE "inventory_movimientos" ADD COLUMN "viaje_id" UUID;
ALTER TABLE "inventory_movimientos" ADD CONSTRAINT "inventory_movimientos_viaje_id_fkey"
  FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "inventory_movimientos_viaje_id_idx" ON "inventory_movimientos"("viaje_id");

-- Proof of delivery: per viaje
ALTER TABLE "proof_of_delivery" DROP CONSTRAINT IF EXISTS "proof_of_delivery_despacho_id_key";
ALTER TABLE "proof_of_delivery" ALTER COLUMN "despacho_id" DROP NOT NULL;

ALTER TABLE "proof_of_delivery" ADD COLUMN "viaje_id" UUID;
ALTER TABLE "proof_of_delivery" ADD COLUMN "estado" "EntregaEstado" NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE "proof_of_delivery" ADD COLUMN "cantidad_esperada" INTEGER;
ALTER TABLE "proof_of_delivery" ADD COLUMN "cantidad_devuelta" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "proof_of_delivery" ADD CONSTRAINT "proof_of_delivery_viaje_id_fkey"
  FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "proof_of_delivery_viaje_id_key" ON "proof_of_delivery"("viaje_id");
CREATE INDEX "proof_of_delivery_despacho_id_idx" ON "proof_of_delivery"("despacho_id");
