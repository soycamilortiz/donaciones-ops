import {
  DonacionImagenEstado,
  MAX_IMAGEN_BYTES,
  OCR_QUEUE,
  type Producto,
  type ReconocerProductoJob,
  type Reconocimiento,
  TIPOS_IMAGEN_ACEPTADOS,
  type TipoImagenAceptado,
} from '@soschoco/shared';
import type { Env } from '../config/env.js';
import { ejecutarTesseract, preprocesar } from '../ocr/tesseract.js';
import { emparejar } from '../productos/emparejar.js';
import type { ContextoJob, DefinicionJob } from './tipos.js';

/** Umbral de emparejamiento contra el catálogo, aparte de la confianza del OCR. */
const UMBRAL_EMPAREJAMIENTO = 0.75;

/**
 * Lo que el job necesita del mundo exterior. Se inyecta para poder probar el
 * flujo completo sin red ni binario de Tesseract.
 */
export type Efectos = {
  descargar: (url: string) => Promise<Buffer>;
  reconocerTexto: (imagen: Buffer) => Promise<{ texto: string; confianza: number }>;
};

/** Los efectos reales, construidos a partir de la configuración del proceso. */
export function crearEfectos(env: Env): Efectos {
  return {
    descargar,
    reconocerTexto: (imagen) => reconocerTexto(imagen, env),
  };
}

export const reconocerProductoJob: DefinicionJob<ReconocerProductoJob> = {
  cola: OCR_QUEUE,
  concurrencia: (env) => env.OCR_CONCURRENCIA,
  intentos: (env) => env.OCR_MAX_INTENTOS,

  async procesar(job, contexto) {
    await procesarImagen(job.data.imagenId, contexto, crearEfectos(contexto.env));
  },

  async alAgotarReintentos(job, error, { prisma }) {
    await prisma.donacionImagen.updateMany({
      where: { id: job.data.imagenId, estado: { not: DonacionImagenEstado.Procesada } },
      data: { estado: DonacionImagenEstado.Fallida, error: error.message.slice(0, 1000) },
    });
  },
};

/**
 * Marca la imagen PROCESANDO, la descarga del Blob, la pasa por el motor de
 * reconocimiento y guarda el resultado ya relacionado con el producto.
 *
 * Es idempotente por `imagenId`: si el job se reintenta vuelve a leer el estado
 * fresco de la base, y si la imagen ya está PROCESADA no hace nada.
 */
export async function procesarImagen(
  imagenId: string,
  contexto: ContextoJob,
  efectos: Efectos,
): Promise<void> {
  const { prisma, env, log } = contexto;

  const imagen = await prisma.donacionImagen.findUnique({ where: { id: imagenId } });
  if (!imagen) {
    log('imagen inexistente, se descarta el job', { imagenId });
    return;
  }
  if (imagen.estado === DonacionImagenEstado.Procesada) {
    log('imagen ya procesada, no se repite', { imagenId });
    return;
  }

  await prisma.donacionImagen.update({
    where: { id: imagenId },
    data: {
      estado: DonacionImagenEstado.Procesando,
      intentos: { increment: 1 },
      error: null,
    },
  });

  const archivo = await efectos.descargar(imagen.blobUrl);
  if (archivo.byteLength > MAX_IMAGEN_BYTES) {
    throw new Error(`La imagen pesa ${archivo.byteLength} bytes, por encima del máximo permitido`);
  }

  const { texto, confianza } = await efectos.reconocerTexto(archivo);
  const resultado = await resolver(texto, confianza, contexto);

  // Aquí queda la relación: la fila conserva la URL del Blob y apunta al
  // producto del catálogo que se reconoció.
  await prisma.donacionImagen.update({
    where: { id: imagenId },
    data: {
      estado: DonacionImagenEstado.Procesada,
      textoOcr: resultado.texto,
      confianza: resultado.confianza,
      productoId: resultado.productoId,
      procesadaEn: new Date(),
      error: null,
    },
  });

  log(resultado.productoId ? 'producto reconocido' : 'sin producto, queda para revisión', {
    imagenId,
    confianza: resultado.confianza,
    productoId: resultado.productoId,
    umbral: env.OCR_CONFIANZA_MINIMA,
  });
}

/**
 * Convierte el texto del OCR en un producto del catálogo.
 *
 * Dos filtros en serie: la confianza que reporta el motor y el puntaje de
 * emparejamiento. Si cualquiera falla se guarda el texto pero no el producto;
 * un hueco en el inventario es corregible, un producto equivocado no se nota.
 */
async function resolver(
  texto: string,
  confianza: number,
  { prisma, env }: ContextoJob,
): Promise<Reconocimiento> {
  if (texto.trim() === '' || confianza < env.OCR_CONFIANZA_MINIMA) {
    return { texto: texto || null, confianza, productoId: null };
  }

  const productos = (await prisma.producto.findMany({
    select: { id: true, nombre: true, marca: true, categoria: true, ean: true, alias: true },
  })) as Producto[];

  const encontrado = emparejar(texto, productos, UMBRAL_EMPAREJAMIENTO);
  return { texto, confianza, productoId: encontrado?.producto.id ?? null };
}

/**
 * Descarga desde Vercel Blob. Las URL del Blob son públicas e inmutables, así
 * que basta un fetch; el token de escritura solo hace falta para subir.
 */
async function descargar(url: string): Promise<Buffer> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`No se pudo descargar la imagen (HTTP ${respuesta.status})`);
  }

  const tipo = respuesta.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!TIPOS_IMAGEN_ACEPTADOS.includes(tipo as TipoImagenAceptado)) {
    throw new Error(`Tipo de archivo no aceptado: ${tipo || 'desconocido'}`);
  }

  return Buffer.from(await respuesta.arrayBuffer());
}

async function reconocerTexto(
  imagen: Buffer,
  env: Env,
): Promise<{ texto: string; confianza: number }> {
  const preparada = await preprocesar(imagen);
  return ejecutarTesseract(preparada, {
    idiomas: env.OCR_IDIOMAS,
    timeoutMs: env.OCR_TIMEOUT_MS,
  });
}
