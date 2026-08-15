import type { PrismaClient } from '@prisma/client';
import { type Job, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Env } from './config/env.js';
import type { ContextoJob, DefinicionJob, Registro } from './jobs/tipos.js';

export type ManagerOpciones = {
  jobs: DefinicionJob<unknown>[];
  prisma: PrismaClient;
  conexion: Redis;
  env: Env;
  log: Registro;
};

/**
 * Levanta un Worker de BullMQ por cada job registrado y centraliza el manejo de
 * eventos y el apagado ordenado. Los jobs no saben nada de BullMQ más allá de
 * recibir su payload.
 */
export class JobManager {
  private readonly workers: Worker[] = [];
  private readonly contexto: ContextoJob;

  constructor(private readonly opciones: ManagerOpciones) {
    this.contexto = {
      prisma: opciones.prisma,
      env: opciones.env,
      log: opciones.log,
    };
  }

  iniciar(): void {
    for (const definicion of this.opciones.jobs) {
      this.workers.push(this.crearWorker(definicion));
      this.opciones.log('job registrado', {
        cola: definicion.cola,
        concurrencia: definicion.concurrencia(this.opciones.env),
        intentos: definicion.intentos(this.opciones.env),
      });
    }
  }

  private crearWorker(definicion: DefinicionJob<unknown>): Worker {
    const { log, env } = this.opciones;

    const worker = new Worker(
      definicion.cola,
      async (job: Job<unknown>) => {
        await definicion.procesar(job, this.contexto);
      },
      {
        connection: this.opciones.conexion,
        concurrency: definicion.concurrencia(env),
      },
    );

    worker.on('completed', (job) => {
      log('job completado', { cola: definicion.cola, jobId: job.id });
    });

    worker.on('failed', (job, error) => {
      log('job fallido', {
        cola: definicion.cola,
        jobId: job?.id,
        intento: job?.attemptsMade,
        error: error.message,
      });

      // Solo se da por perdido cuando ya no quedan reintentos; los fallos
      // intermedios los reintenta BullMQ y no deben marcar nada en la base.
      if (!job || !definicion.alAgotarReintentos) {
        return;
      }
      const limite = job.opts.attempts ?? definicion.intentos(env);
      if (job.attemptsMade < limite) {
        return;
      }

      void definicion.alAgotarReintentos(job, error, this.contexto).catch((err: unknown) => {
        log('no se pudo registrar el fallo definitivo', {
          cola: definicion.cola,
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    });

    worker.on('error', (error) => {
      log('error del worker', { cola: definicion.cola, error: error.message });
    });

    return worker;
  }

  /** Espera a que terminen los jobs en vuelo antes de soltar las conexiones. */
  async detener(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }
}
