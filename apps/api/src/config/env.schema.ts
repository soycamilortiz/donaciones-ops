import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return value;
};

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  CORS_ORIGIN: z.string().default('http://localhost'),
  JWT_SECRET: z.string().min(16).default('soschoco-dev-jwt-secret-cambia-esto'),
  JWT_EXPIRES_IN: z.string().min(1).default('8h'),

  /** Cola de reconocimiento de imágenes. La consume apps/worker. */
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /**
   * Token de escritura de Vercel Blob (flujo actual). Sin él, donaciones
   * responde 503. Se reemplaza por Cloudflare R2.
   */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  /** Account ID de Cloudflare (Settings → R2). */
  R2_ACCOUNT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  /** Access Key ID de un API token R2 (Object Read & Write). Solo backend. */
  R2_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  R2_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  R2_BUCKET: z.string().min(1).default('sos-choco'),
  /**
   * Endpoint S3 sin el nombre del bucket:
   * `https://<accountid>.r2.cloudflarestorage.com`
   */
  R2_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().optional()),
  /**
   * Base pública para armar URLs de imagen (custom domain o r2.dev).
   * Ejemplo: `https://media.ejemplo.org` o `https://pub-xxxxx.r2.dev`
   */
  R2_PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),

  /**
   * Sincroniza el catalogo de roles y permisos al arrancar. Tiene sentido en un
   * proceso de larga vida (Docker), pero en serverless correria en cada
   * arranque en frio: son ~20 escrituras que retrasan la primera peticion y
   * tumban la funcion si la base no responde. Alli se pone en false y se
   * sincroniza con `pnpm --filter api rbac:sync` tras cada despliegue.
   */
  RBAC_SYNC_ON_BOOT: z
    .enum(['true', 'false'])
    .default('true')
    .transform((valor) => valor === 'true'),

  /**
   * Swagger recorre toda la metadata al construir el documento. En un proceso
   * de larga vida se paga una vez; en serverless, en cada arranque en frio.
   */
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((valor) => valor === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Validación de variables de entorno: ${formatted}`);
  }

  return result.data;
}
