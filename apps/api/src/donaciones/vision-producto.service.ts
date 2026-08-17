import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createVisionClient, type LecturaProducto, type VisionAdapter } from '@soschoco/vision';
import type { Env } from '../config/env.schema';

export type LecturaVision = LecturaProducto;

/**
 * Thin Nest wrapper around `@soschoco/vision`.
 * Swap models with VISION_PROVIDER / VISION_MODEL or inject another adapter.
 */
@Injectable()
export class VisionProductoService {
  private readonly log = new Logger(VisionProductoService.name);
  private readonly client: VisionAdapter;

  constructor(config: ConfigService<Env, true>) {
    this.client = createVisionClient({
      provider: config.get('VISION_PROVIDER', { infer: true }),
      apiKey: config.get('VISION_API_KEY', { infer: true }),
      baseUrl: config.get('VISION_BASE_URL', { infer: true }),
      model: config.get('VISION_MODEL', { infer: true }),
      timeoutMs: config.get('VISION_TIMEOUT_MS', { infer: true }),
      logger: {
        warn: (message: string) => this.log.warn(message),
      },
    });
  }

  get configured(): boolean {
    return this.client.id !== 'noop';
  }

  get providerId(): string {
    return this.client.id;
  }

  async leerImagen(bytes: Buffer, contentType: string): Promise<LecturaVision | null> {
    return this.client.leerProducto({ bytes, contentType });
  }
}
