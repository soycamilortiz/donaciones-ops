import { NoopVisionAdapter } from './adapters/noop.js';
import { OpenAiCompatibleAdapter } from './adapters/openai-compatible.js';
import type { VisionAdapter, VisionLogger, VisionProvider } from './types.js';
import { VisionProvider as Providers } from './types.js';

export type CreateVisionClientOptions = {
  provider?: VisionProvider | string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  logger?: VisionLogger;
  /** Inyectable en tests. */
  fetchImpl?: typeof fetch;
  /** Si querés registrar un adapter custom sin tocar el factory. */
  adapter?: VisionAdapter;
};

/**
 * Arma el cliente de visión. Sin apiKey (salvo adapter inyectado) cae a noop.
 * Para cambiar de modelo/proveedor: VISION_PROVIDER + VISION_MODEL, o `adapter`.
 */
export function createVisionClient(options: CreateVisionClientOptions = {}): VisionAdapter {
  if (options.adapter) {
    return options.adapter;
  }

  const provider = (options.provider ?? Providers.OpenAiCompatible).toLowerCase();
  const apiKey = options.apiKey?.trim();

  if (!apiKey || provider === Providers.Noop) {
    return new NoopVisionAdapter(options.logger);
  }

  if (provider === Providers.OpenAiCompatible) {
    return new OpenAiCompatibleAdapter({
      apiKey,
      baseUrl: options.baseUrl ?? 'https://api.openai.com/v1',
      model: options.model ?? 'gpt-4.1-nano',
      timeoutMs: options.timeoutMs ?? 45_000,
      logger: options.logger,
      fetchImpl: options.fetchImpl,
    });
  }

  options.logger?.warn(`Proveedor de visión desconocido: ${provider}; usando noop`);
  return new NoopVisionAdapter(options.logger);
}
