import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OCR_JOB_RECONOCER, OCR_QUEUE, type ReconocerProductoJob } from '@soschoco/shared';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.schema';

/**
 * Productor de la cola que consume apps/worker. El API solo encola; todo el
 * procesamiento pesado (descarga, Tesseract, emparejamiento) ocurre allá.
 *
 * La conexión es perezosa a propósito. Antes se abría en el constructor, lo que
 * significaba que el módulo no podía instanciarse sin Redis levantado: en
 * serverless eso tumba el arranque en frío completo, aunque la petición ni
 * toque la cola.
 */
@Injectable()
export class ColaService implements OnModuleDestroy {
  private readonly logger = new Logger(ColaService.name);
  private conexion: Redis | null = null;
  private cola: Queue<ReconocerProductoJob> | null = null;

  private readonly intentos = 3;

  constructor(private readonly config: ConfigService<Env, true>) {}

  private obtenerCola(): Queue<ReconocerProductoJob> {
    if (this.cola) {
      return this.cola;
    }

    this.conexion = new Redis(this.config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null,
      // Sin esto, en serverless un Redis inalcanzable deja la petición colgada
      // hasta el timeout de la función en vez de fallar con un error legible.
      connectTimeout: 5_000,
      enableOfflineQueue: false,
      lazyConnect: false,
    });

    this.conexion.on('error', (error) => {
      this.logger.error(`Redis: ${error.message}`);
    });

    this.cola = new Queue<ReconocerProductoJob>(OCR_QUEUE, { connection: this.conexion });
    return this.cola;
  }

  /**
   * `jobId` es el id de la imagen: si el cliente reintenta el registro por una
   * red inestable, BullMQ descarta el duplicado en vez de procesar dos veces.
   */
  async encolarReconocimiento(imagenId: string): Promise<void> {
    await this.obtenerCola().add(
      OCR_JOB_RECONOCER,
      { imagenId },
      {
        jobId: imagenId,
        attempts: this.intentos,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 24 * 3600, count: 1_000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.cola?.close();
    await this.conexion?.quit();
  }
}
