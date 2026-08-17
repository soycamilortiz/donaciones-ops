import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

export type ProductoOff = {
  ean: string;
  nombre: string;
  marca: string | null;
  imagenUrl: string | null;
};

type RespuestaOff = {
  status?: number;
  product?: {
    code?: string;
    product_name?: string;
    product_name_es?: string;
    brands?: string;
    image_url?: string;
  };
};

@Injectable()
export class OpenFoodFactsService {
  private readonly log = new Logger(OpenFoodFactsService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  get enabled(): boolean {
    return this.config.get('OPEN_FOOD_FACTS_ENABLED', { infer: true });
  }

  async buscarPorEan(ean: string): Promise<ProductoOff | null> {
    if (!this.enabled) {
      return null;
    }

    const base = this.config.get('OPEN_FOOD_FACTS_BASE_URL', { infer: true }).replace(/\/$/, '');
    const userAgent = this.config.get('OPEN_FOOD_FACTS_USER_AGENT', { infer: true });
    const timeoutMs = this.config.get('OPEN_FOOD_FACTS_TIMEOUT_MS', { infer: true });
    const url = `${base}/api/v2/product/${ean}.json?fields=code,product_name,product_name_es,brands,image_url`;

    try {
      const respuesta = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!respuesta.ok) {
        this.log.warn(`Open Food Facts HTTP ${respuesta.status} para EAN ${ean}`);
        return null;
      }
      const json = (await respuesta.json()) as RespuestaOff;
      if (json.status !== 1 || !json.product) {
        return null;
      }
      const nombre = (json.product.product_name_es || json.product.product_name || '').trim();
      if (!nombre) {
        return null;
      }
      const marca = json.product.brands?.split(',')[0]?.trim() || null;
      return {
        ean: (json.product.code || ean).replace(/\D/g, '') || ean,
        nombre,
        marca,
        imagenUrl: json.product.image_url?.trim() || null,
      };
    } catch (err) {
      this.log.warn(
        `Open Food Facts no respondió para EAN ${ean}: ${err instanceof Error ? err.message : 'error'}`,
      );
      return null;
    }
  }
}
