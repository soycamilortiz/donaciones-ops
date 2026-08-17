import { parseLecturaProducto, toDataUrl } from '../parse.js';
import { PROMPT_PRODUCTO_DONADO } from '../prompt.js';
import type { ImagenVision, LecturaProducto, VisionAdapter, VisionLogger } from '../types.js';

export type OpenAiCompatibleConfig = {
  apiKey: string;
  /** Ej. https://api.openai.com/v1 */
  baseUrl: string;
  model: string;
  timeoutMs: number;
  logger?: VisionLogger;
  fetchImpl?: typeof fetch;
};

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

/**
 * Cualquier API estilo OpenAI Chat Completions con image_url
 * (OpenAI, Azure OpenAI, Groq vision, etc.).
 */
export class OpenAiCompatibleAdapter implements VisionAdapter {
  readonly id = 'openai';

  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly config: OpenAiCompatibleConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  async leerProducto(imagen: ImagenVision): Promise<LecturaProducto | null> {
    const dataUrl = toDataUrl(imagen.bytes, imagen.contentType);

    try {
      const respuesta = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: PROMPT_PRODUCTO_DONADO },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });

      if (!respuesta.ok) {
        this.config.logger?.warn(`Visión HTTP ${respuesta.status}`);
        return null;
      }

      const json = (await respuesta.json()) as ChatResponse;
      const raw = json.choices?.[0]?.message?.content;
      if (!raw) {
        return null;
      }
      return parseLecturaProducto(raw);
    } catch (err) {
      this.config.logger?.warn(`Visión falló: ${err instanceof Error ? err.message : 'error'}`);
      return null;
    }
  }
}
