-- CreateEnum
CREATE TYPE "InventoryCategoria" AS ENUM ('ALIMENTOS_NO_PERECEDEROS', 'AGUA', 'ASEO_HIGIENE', 'PANALES_BEBE', 'MEDICAMENTOS', 'ROPA_CALZADO', 'COLCHONETAS_COBIJAS', 'ALIMENTO_MASCOTAS', 'MEDICAMENTO_MASCOTAS', 'LOGISTICA_RESCATE', 'MENAJE_COCINA', 'DESECHABLES', 'OTRO');

CREATE TYPE "InventoryUnidad" AS ENUM ('UNIDAD', 'LIBRA', 'KILO', 'LITRO', 'BOTELLA', 'LATA', 'PAQUETE', 'CAJA', 'GALON', 'FRASCO', 'TABLETA', 'DOCENA', 'OTRO');

CREATE TYPE "InventoryEstado" AS ENUM ('NUEVO', 'BUEN_ESTADO', 'USADO', 'PROXIMO_A_VENCER', 'VENCIDO', 'NO_APLICA');

CREATE TYPE "InventoryDestinatario" AS ENUM ('NO_APLICA', 'UNISEX', 'MUJER', 'HOMBRE', 'NINO', 'NINA', 'BEBE', 'MASCOTA');

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "InventoryCategoria" NOT NULL,
    "categoria_detalle" TEXT,
    "sku" TEXT,
    "marca" TEXT,
    "presentacion" TEXT,
    "talla" TEXT,
    "destinatario" "InventoryDestinatario" NOT NULL DEFAULT 'NO_APLICA',
    "cantidad" DECIMAL(14,3) NOT NULL,
    "unidad" "InventoryUnidad" NOT NULL,
    "unidad_detalle" TEXT,
    "vencimiento" DATE,
    "estado" "InventoryEstado" NOT NULL DEFAULT 'BUEN_ESTADO',
    "lote_codigo" TEXT,
    "ubicacion_interna" TEXT,
    "donante_nombre" TEXT,
    "donante_contacto" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_items_acopio_id_idx" ON "inventory_items"("acopio_id");
CREATE INDEX "inventory_items_acopio_id_categoria_idx" ON "inventory_items"("acopio_id", "categoria");
CREATE INDEX "inventory_items_acopio_id_nombre_idx" ON "inventory_items"("acopio_id", "nombre");

ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
