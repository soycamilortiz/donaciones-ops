/**
 * Contrato estable entre el API y cualquier motor de visión.
 * Cambiar de OpenAI a otro proveedor = otro adapter, misma salida.
 */

export type LecturaProducto = {
  nombre: string | null;
  marca: string | null;
  cantidad: number | null;
  ean: string | null;
};

export type ImagenVision = {
  bytes: Uint8Array;
  contentType: string;
};

export type VisionAdapter = {
  readonly id: string;
  leerProducto(imagen: ImagenVision): Promise<LecturaProducto | null>;
};

export type VisionLogger = {
  warn(message: string): void;
};

export const VisionProvider = {
  OpenAiCompatible: 'openai',
  Noop: 'noop',
} as const;

export type VisionProvider = (typeof VisionProvider)[keyof typeof VisionProvider];
