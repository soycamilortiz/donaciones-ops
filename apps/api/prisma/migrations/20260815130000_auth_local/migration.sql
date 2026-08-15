-- Auth propia: usuario + hash de contraseña. Se elimina Clerk.
DELETE FROM "memberships";
DELETE FROM "users";

DROP INDEX IF EXISTS "users_clerk_user_id_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_user_id";

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "usuario" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

UPDATE "users" SET "usuario" = "correo" WHERE "usuario" IS NULL;
UPDATE "users" SET "password_hash" = 'invalid' WHERE "password_hash" IS NULL;

ALTER TABLE "users" ALTER COLUMN "usuario" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_usuario_key" ON "users"("usuario");

CREATE TABLE IF NOT EXISTS "captcha_challenges" (
    "id" UUID NOT NULL,
    "answer_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captcha_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "captcha_challenges_expires_at_idx" ON "captcha_challenges"("expires_at");
