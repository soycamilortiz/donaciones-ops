import type { ImagenVision, LecturaProducto, VisionAdapter, VisionLogger } from '../types.js';

/** Sin clave / sin proveedor: el operador completa a mano. */
export class NoopVisionAdapter implements VisionAdapter {
  readonly id = 'noop';

  constructor(private readonly log?: VisionLogger) {}

  async leerProducto(_imagen: ImagenVision): Promise<LecturaProducto | null> {
    this.log?.warn('Visión noop: no hay proveedor configurado');
    return null;
  }
}
