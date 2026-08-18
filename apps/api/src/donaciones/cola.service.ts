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
   *
   * Por lo mismo hay que borrar el job anterior antes de reencolar: BullMQ
   * conserva los terminados (24 h) y los fallidos (7 días), y con el id ya
   * ocupado el `add` se descarta en silencio. Sin esto, reprocesar una imagen
   * fallida la dejaba en PENDIENTE para siempre — justo el caso que el endpoint
   * existe para resolver.
   */
  async encolarReconocimiento(imagenId: string): Promise<void> {
    const cola = this.obtenerCola();
    // Devuelve 0 (sin borrar) si el worker lo tiene tomado ahora mismo, así que
    // no interrumpe un procesamiento en curso.
    await cola.remove(imagenId).catch((error: unknown) => {
      this.logger.warn(
        `No se pudo limpiar el job previo ${imagenId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
    await cola.add(
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
