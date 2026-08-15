import type { PrismaClient } from '@prisma/client';
import type { Job } from 'bullmq';
import type { Env } from '../config/env.js';

/** Lo que el manager le pasa a cada job. */
export type ContextoJob = {
  prisma: PrismaClient;
  env: Env;
  log: Registro;
};

export type Registro = (mensaje: string, extra?: Record<string, unknown>) => void;

/**
 * Un job registrable. El manager crea un Worker de BullMQ por cada definición,
 * así que añadir un job nuevo es escribir un archivo en esta carpeta y sumarlo
 * a `registro.ts`; no hay que tocar el arranque.
 */
export type DefinicionJob<TPayload = unknown> = {
  /** Nombre de la cola en Redis. */
  readonly cola: string;
  /** Cuántos jobs de esta cola se procesan a la vez. */
  concurrencia(env: Env): number;
  /** Reintentos antes de darlo por perdido. */
  intentos(env: Env): number;
  procesar(job: Job<TPayload>, contexto: ContextoJob): Promise<void>;
  /**
   * Se llama solo cuando se agotaron los reintentos, para dejar constancia del
   * fallo en la base. Opcional.
   */
  alAgotarReintentos?(job: Job<TPayload>, error: Error, contexto: ContextoJob): Promise<void>;
};
