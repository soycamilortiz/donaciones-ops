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
  sku: string;
  nombre: string;
  marca?: string | null;
  categoria?: string | null;
  categoriaInventario?: string | null;
  ean?: string | null;
  alias: string[];
  unidadBase?: string;
  presentacion?: string | null;
  requiereLote?: boolean;
  requiereVencimiento?: boolean;
  esPerecedero?: boolean;
  isActive?: boolean;
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
  nombreDetectado?: string | null;
  cantidadDetectada?: number | null;
  confirmadaEn?: string | null;
  inventoryItemId?: string | null;
  recepcionItemId?: string | null;
  producto?: Producto | null;
  procesadaEn?: string | null;
  createdAt: string;
};

/**
 * Ruta reservada por el API para una foto nueva. La PWA hace PUT a `uploadUrl`
 * (firmado, 5 min) y luego registra `pathname`.
 */
export type RutaSubida = {
  pathname: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
  tiposAceptados: readonly string[];
  /** Tope del objeto ya comprimido que se sube a R2. */
  maxBytes: number;
  /** Tope del archivo crudo del móvil antes de comprimir en la PWA. */
  maxBytesEntrada?: number;
};

/**
 * Resultado de un motor de reconocimiento. Tesseract es el primero, pero la
 * forma sirve igual para un lector de código de barras o un modelo de visión.
 */
export type Reconocimiento = {
  texto: string | null;
  confianza: number | null;
  productoId: string | null;
  nombreDetectado: string | null;
  cantidadDetectada: number | null;
};

/** Tamaño máximo del archivo crudo del móvil antes de comprimir en la PWA. */
export const MAX_IMAGEN_BYTES = 10 * 1024 * 1024;

/** Lado largo máximo tras comprimir (px). Suficiente para etiquetas y visión. */
export const IMAGEN_LADO_MAX = 2048;

/** Calidad JPEG inicial al comprimir (0..1). */
export const IMAGEN_CALIDAD_JPEG = 0.82;

/** Calidades progresivas si el peso objetivo no se alcanza. */
export const IMAGEN_CALIDADES_FALLBACK = [0.82, 0.8, 0.75, 0.7] as const;

/** MIME único guardado en R2 tras comprimir en cliente. */
export const IMAGEN_FORMATO_ALMACENAMIENTO = 'image/jpeg' as const;

/** Peso objetivo por foto en R2 (~600 KB). */
export const IMAGEN_PESO_OBJETIVO = 600 * 1024;

/** Tope duro tras comprimir; la PWA rechaza y el API valida en registro. */
export const IMAGEN_PESO_MAX = Math.floor(1.5 * 1024 * 1024);

export const TIPOS_IMAGEN_ACEPTADOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

export type TipoImagenAceptado = (typeof TIPOS_IMAGEN_ACEPTADOS)[number];

/** Lo que mandan cámaras y Windows en vez del MIME canónico. */
const ALIAS_TIPO_IMAGEN: Record<string, TipoImagenAceptado> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/x-png': 'image/png',
  'image/webp': 'image/webp',
  'image/heic': 'image/heic',
  'image/heif': 'image/heic',
  'image/heic-sequence': 'image/heic',
  'image/heif-sequence': 'image/heic',
};

const EXTENSION_TIPO: Record<string, TipoImagenAceptado> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heic',
};

/**
 * El `<input capture>` a menudo manda `image/jpg`, vacío u `octet-stream`.
 * Devolvemos un tipo de `TIPOS_IMAGEN_ACEPTADOS` o null.
 */
export function normalizarTipoImagen(
  tipo: string | undefined,
  nombreArchivo = '',
): TipoImagenAceptado | null {
  const mime = (tipo ?? '').trim().toLowerCase().split(';')[0] ?? '';
  if (mime && ALIAS_TIPO_IMAGEN[mime]) {
    return ALIAS_TIPO_IMAGEN[mime];
  }

  const punto = nombreArchivo.lastIndexOf('.');
  const ext = punto >= 0 ? nombreArchivo.slice(punto + 1).toLowerCase() : '';
  if (ext && EXTENSION_TIPO[ext]) {
    return EXTENSION_TIPO[ext];
  }

  if (!mime || mime === 'application/octet-stream') {
    return 'image/jpeg';
  }

  return null;
}

/** Respuesta paginada por cursor. */
export type Pagina<T> = {
  items: T[];
  /** `null` cuando ya no hay más. */
  siguienteCursor: string | null;
};

/** De dónde salió el nombre al resolver un EAN. */
export const FuenteCatalogo = {
  Local: 'local',
  OpenFoodFacts: 'openfoodfacts',
  Ninguna: 'ninguna',
} as const;

export type FuenteCatalogo = (typeof FuenteCatalogo)[keyof typeof FuenteCatalogo];

export type ConsultaEan = {
  fuente: FuenteCatalogo;
  ean: string;
  nombre: string | null;
  marca: string | null;
  imagenUrl: string | null;
  productoId: string | null;
};

export type EntradaDonacion = {
  inventoryItemId: string;
  nombre: string;
  cantidad: number;
  ean: string | null;
};

export type InterpretacionDonacion = {
  via: 'ean' | 'vision' | 'manual';
  fuenteEan: FuenteCatalogo | null;
  ean: string | null;
  nombre: string | null;
  marca: string | null;
  cantidad: number | null;
  coincidencias: Array<{
    id: string;
    nombre: string;
    marca: string | null;
    cantidad: number;
    score: number;
    unidadBase?: string;
    requiereLote?: boolean;
    requiereVencimiento?: boolean;
  }>;
};
