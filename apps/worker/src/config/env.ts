import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  /** Cuántas imágenes procesa en paralelo este proceso. */
  OCR_CONCURRENCIA: z.coerce.number().int().min(1).max(16).default(2),
  /** Reintentos por imagen antes de marcarla FALLIDA. */
  OCR_MAX_INTENTOS: z.coerce.number().int().min(1).max(10).default(3),
  /** Corta el proceso de Tesseract si se pasa de este tiempo. */
  OCR_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
  /** Idiomas de Tesseract, separados por '+'. */
  OCR_IDIOMAS: z.string().default('spa+eng'),
  /**
   * Confianza mínima para aceptar el producto que resolvió el motor. Por
   * debajo de esto la imagen queda PROCESADA pero sin producto, para revisión
   * manual: preferimos un hueco a un dato inventado en el inventario.
   */
  OCR_CONFIANZA_MINIMA: z.coerce.number().min(0).max(1).default(0.6),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración inválida del worker:\n${detalle}`);
  }
  return parsed.data;
}
