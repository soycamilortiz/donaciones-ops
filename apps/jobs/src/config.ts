import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3100),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  /**
   * El panel deja pausar colas y borrar jobs, así que va detrás de basic auth.
   * Si falta la contraseña el proceso no arranca: es preferible a exponerlo.
   */
  JOBS_USER: z.string().min(1).default('admin'),
  JOBS_PASSWORD: z.string().min(8, 'JOBS_PASSWORD debe tener al menos 8 caracteres'),

  /** Prefijo de la ruta, para colgarlo de Traefik. */
  JOBS_BASE_PATH: z.string().default('/jobs'),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración inválida del panel de jobs:\n${detalle}`);
  }
  return parsed.data;
}
