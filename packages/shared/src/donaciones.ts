/**
 * Contrato entre el API (que encola) y el worker (que procesa) para el
 * reconocimiento de productos donados a partir de una foto.
 */

import type { DonacionImagenEstado } from './enums.js';

/** Nombre de la cola en Redis. Lo comparten productor y consumidor. */
export const OCR_QUEUE = 'donacion-imagenes';

/** Nombre del job dentro de la cola. */
export const OCR_JOB_RECONOCER = 'reconocer-producto';

/**
 * Payload del job. Deliberadamente mínimo: solo el id de la fila, para que el
 * worker lea el estado fresco de la base y no procese datos rancios si el job
 * se reintenta mucho después de encolarse.
 */
export type ReconocerProductoJob = {
  imagenId: string;
};

export type Producto = {
  id: string;
  nombre: string;
  marca?: string | null;
  categoria?: string | null;
  ean?: string | null;
  alias: string[];
};

export type DonacionImagen = {
  id: string;
  organizationId: string;
  acopioId?: string | null;
  acopio?: { id: string; nombre: string; municipio?: string | null } | null;
  blobUrl: string;
  estado: DonacionImagenEstado;
  intentos: number;
  error?: string | null;
  textoOcr?: string | null;
  confianza?: number | null;
  producto?: Producto | null;
  procesadaEn?: string | null;
  createdAt: string;
};

/**
 * Ruta reservada por el API para una foto nueva. La PWA se la pasa a `upload()`
 * del SDK de Vercel Blob; el token lo negocia el SDK por su cuenta contra
 * `/subidas`, que implementa el protocolo `handleUpload`.
 */
export type RutaSubida = {
  pathname: string;
  tiposAceptados: readonly string[];
  maxBytes: number;
};

/**
 * Resultado de un motor de reconocimiento. Tesseract es el primero, pero la
 * forma sirve igual para un lector de código de barras o un modelo de visión.
 */
export type Reconocimiento = {
  /** Texto crudo, si el motor produce alguno. */
  texto: string | null;
  /** 0..1. Null si el motor no reporta confianza. */
  confianza: number | null;
  /** Id del producto del catálogo, si se pudo resolver. */
  productoId: string | null;
};

export const MAX_IMAGEN_BYTES = 10 * 1024 * 1024;

export const TIPOS_IMAGEN_ACEPTADOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

export type TipoImagenAceptado = (typeof TIPOS_IMAGEN_ACEPTADOS)[number];

/** Respuesta paginada por cursor. */
export type Pagina<T> = {
  items: T[];
  /** `null` cuando ya no hay más. */
  siguienteCursor: string | null;
};
