import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OCR_JOB_RECONOCER, OCR_QUEUE, type ReconocerProductoJob } from '@soschoco/shared';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.schema';

/**
 * Productor de la cola que consume apps/worker. El API solo encola; todo el
 * procesamiento pesado (descarga, Tesseract, emparejamiento) ocurre allá.
 */
@Injectable()
export class ColaService implements OnModuleDestroy {
  private readonly conexion: Redis;
  private readonly cola: Queue<ReconocerProductoJob>;
  private readonly intentos: number;

  constructor(config: ConfigService<Env, true>) {
    this.conexion = new Redis(config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null,
    });
    this.cola = new Queue<ReconocerProductoJob>(OCR_QUEUE, { connection: this.conexion });
    this.intentos = 3;
  }

  /**
   * `jobId` es el id de la imagen: si el cliente reintenta el registro por una
   * red inestable, BullMQ descarta el duplicado en vez de procesar dos veces.
   */
  async encolarReconocimiento(imagenId: string): Promise<void> {
    await this.cola.add(
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
    await this.cola.close();
    await this.conexion.quit();
  }
}
