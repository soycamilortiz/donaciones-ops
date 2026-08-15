import { z } from 'zod';

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
   * Token de escritura de Vercel Blob. El API no sube el archivo: solo firma
   * el permiso para que la PWA lo suba directo. Sin él, el módulo de
   * donaciones responde 503 en vez de tumbar el arranque.
   */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
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
