-- The schema switched this relation to onDelete: Restrict but no migration was
-- generated for it, so CI kept failing on the drift check.
--
-- Restrict is the safer default here: deleting an organisation that still has
-- donation photos would silently destroy the evidence of what was received.
-- Now the delete is refused until the photos are handled.
-- DropForeignKey
ALTER TABLE "donacion_imagenes" DROP CONSTRAINT "donacion_imagenes_organization_id_fkey";

-- AddForeignKey
ALTER TABLE "donacion_imagenes" ADD CONSTRAINT "donacion_imagenes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

