ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organizations" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "acopios" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "roles" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "memberships" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "acopios" DROP CONSTRAINT "acopios_organization_id_fkey";
ALTER TABLE "acopios" ADD CONSTRAINT "acopios_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "memberships" DROP CONSTRAINT "memberships_user_id_fkey";
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "memberships" DROP CONSTRAINT "memberships_organization_id_fkey";
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_acopio_id_fkey";
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
