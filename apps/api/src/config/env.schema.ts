import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  CORS_ORIGIN: z.string().default('http://localhost'),
  JWT_SECRET: z.string().min(16).default('soschoco-dev-jwt-secret-cambia-esto'),
  JWT_EXPIRES_IN: z.string().min(1).default('8h'),
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
