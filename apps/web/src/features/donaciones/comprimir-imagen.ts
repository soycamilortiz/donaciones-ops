import {
  IMAGEN_CALIDADES_FALLBACK,
  IMAGEN_FORMATO_ALMACENAMIENTO,
  IMAGEN_LADO_MAX,
  IMAGEN_PESO_MAX,
  IMAGEN_PESO_OBJETIVO,
  MAX_IMAGEN_BYTES,
  normalizarTipoImagen,
} from '@soschoco/shared';
import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';

const UMBRAL_WEB_WORKER = 2 * 1024 * 1024;

function nombreJpg(nombreArchivo: string): string {
  const base = nombreArchivo.replace(/\.[^.]+$/, '').trim() || 'donacion';
  return `${base}.jpg`;
}

function esHeic(archivo: File): boolean {
  return normalizarTipoImagen(archivo.type, archivo.name) === 'image/heic';
}

async function convertirHeic(archivo: File): Promise<File> {
  const convertido = await heic2any({
    blob: archivo,
    toType: IMAGEN_FORMATO_ALMACENAMIENTO,
    quality: 0.92,
  });
  const blob = Array.isArray(convertido) ? convertido[0] : convertido;
  if (!blob) {
    throw new Error('HEIC_CONVERT_FAILED');
  }
  return new File([blob], nombreJpg(archivo.name), { type: IMAGEN_FORMATO_ALMACENAMIENTO });
}

/**
 * Comprime la foto del móvil antes del PUT a R2: rota EXIF, redimensiona,
 * convierte HEIC→JPEG y baja calidad hasta cumplir peso objetivo.
 */
export async function comprimirImagen(archivo: File): Promise<File> {
  if (archivo.size > MAX_IMAGEN_BYTES) {
    throw new Error('COMPRESS_INPUT_TOO_LARGE');
  }

  const tipo = normalizarTipoImagen(archivo.type, archivo.name);
  if (!tipo) {
    throw new Error('COMPRESS_UNSUPPORTED');
  }

  const fuente = esHeic(archivo) ? await convertirHeic(archivo) : archivo;
  let ultima: File = fuente;

  for (const calidad of IMAGEN_CALIDADES_FALLBACK) {
    const blob = await imageCompression(fuente, {
      maxSizeMB: IMAGEN_PESO_OBJETIVO / (1024 * 1024),
      maxWidthOrHeight: IMAGEN_LADO_MAX,
      useWebWorker: fuente.size > UMBRAL_WEB_WORKER,
      fileType: IMAGEN_FORMATO_ALMACENAMIENTO,
      initialQuality: calidad,
      alwaysKeepResolution: false,
      preserveExif: false,
    });
    ultima = new File([blob], nombreJpg(fuente.name), {
      type: IMAGEN_FORMATO_ALMACENAMIENTO,
    });
    if (ultima.size <= IMAGEN_PESO_MAX) {
      return ultima;
    }
  }

  if (ultima.size > IMAGEN_PESO_MAX) {
    throw new Error('COMPRESS_OUTPUT_TOO_LARGE');
  }

  return ultima;
}
