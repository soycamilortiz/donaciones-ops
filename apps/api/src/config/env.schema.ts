import { z } from 'zod';

/**
 * Vercel define VERCEL=1 en build y en ejecución. Sirve para elegir defaults
 * distintos sin que nadie tenga que configurarlos: lo que es razonable en un
 * proceso de larga vida no lo es en una función que arranca en frío muchas
 * veces al día.
 */
const enServerless = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

const bandera = (porDefecto: boolean) =>
  z
    .enum(['true', 'false'])
    .default(porDefecto ? 'true' : 'false')
    .transform((valor) => valor === 'true');

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
   * Obsoleto. Las donaciones suben a Cloudflare R2 (`R2_*`).
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
   *
   * En serverless el default ya es `false`: no hay que acordarse de ponerlo.
   */
  RBAC_SYNC_ON_BOOT: bandera(!enServerless),

  /**
   * Swagger recorre toda la metadata al construir el documento. En un proceso
   * de larga vida se paga una vez; en serverless, en cada arranque en frio.
   *
   * En serverless el default ya es `false`. Se puede forzar a `true` para
   * depurar, asumiendo el coste en cada arranque.
   */
  SWAGGER_ENABLED: bandera(!enServerless),

  /**
   * Open Food Facts (lookup EAN cuando el código no está en `productos`).
   * No pide API key. El User-Agent es obligatorio para no ser tratado como bot.
   * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
   */
  OPEN_FOOD_FACTS_ENABLED: bandera(true),
  OPEN_FOOD_FACTS_BASE_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .transform((v) => v ?? 'https://world.openfoodfacts.org'),
  OPEN_FOOD_FACTS_USER_AGENT: z.string().min(8).default('SOSChoco/1.0 (contacto@soschoco.local)'),
  OPEN_FOOD_FACTS_TIMEOUT_MS: z.coerce.number().int().positive().max(30000).default(8000),

  /**
   * Visión vía `@soschoco/vision` (adapters). Sin VISION_API_KEY → noop.
   * `VISION_PROVIDER=openai` usa Chat Completions compatible (OpenAI, Azure, etc.).
   */
  VISION_PROVIDER: z.string().min(1).default('openai'),
  VISION_API_KEY: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
  VISION_BASE_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .transform((v) => v ?? 'https://api.openai.com/v1'),
  VISION_MODEL: z.string().min(1).default('gpt-4.1-nano'),
  VISION_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).default(45000),

  /**
   * `true`: envía el mail con Resend.
   * `false`: no llama a Resend; imprime código y link en los logs del API
   * (Docker local). El registro igual exige verificar antes del JWT.
   */
  EMAIL_VERIFICATION: bandera(false),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
  MAIL_FROM: z.string().min(3).default('SOS Chocó <beth.t@example.com>'),
  /** Origen del front para armar el link del mail (`http://localhost` en Docker). */
  PUBLIC_WEB_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .transform((v) => v ?? 'http://localhost'),

  /** Google Sign-In (OAuth). Solo hace falta el client ID para validar el ID token. */
  GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
  /** Reservado por si más adelante usamos flujo authorization-code en el API. */
  GOOGLE_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
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
