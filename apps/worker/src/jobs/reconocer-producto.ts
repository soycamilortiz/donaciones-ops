import {
  DonacionImagenEstado,
  MAX_IMAGEN_BYTES,
  OCR_QUEUE,
  type Producto,
  type ReconocerProductoJob,
  type Reconocimiento,
} from '@soschoco/shared';
import type { Env } from '../config/env.js';
import { parsearEtiqueta } from '../ocr/etiqueta.js';
import { ejecutarTesseract, preprocesar } from '../ocr/tesseract.js';
import { emparejar } from '../productos/emparejar.js';
import { descargarObjetoR2 } from '../r2.js';
import type { ContextoJob, DefinicionJob } from './tipos.js';

/** Umbral de emparejamiento contra el catálogo, aparte de la confianza del OCR. */
const UMBRAL_EMPAREJAMIENTO = 0.75;

/**
 * Lo que el job necesita del mundo exterior. Se inyecta para poder probar el
 * flujo completo sin red ni binario de Tesseract.
 */
export type Efectos = {
  descargar: (url: string, pathname?: string) => Promise<Buffer>;
  reconocerTexto: (imagen: Buffer) => Promise<{ texto: string; confianza: number }>;
};

/** Los efectos reales, construidos a partir de la configuración del proceso. */
export function crearEfectos(env: Env): Efectos {
  return {
    descargar: (_url, pathname) => descargar(env, pathname),
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
 * Marca la imagen PROCESANDO, la descarga de R2, la pasa por el motor de
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
  const { prisma, log } = contexto;

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

  const archivo = await efectos.descargar(imagen.blobUrl, imagen.blobPathname);
  if (archivo.byteLength > MAX_IMAGEN_BYTES) {
    throw new Error(`La imagen pesa ${archivo.byteLength} bytes, por encima del máximo permitido`);
  }

  const { texto, confianza } = await efectos.reconocerTexto(archivo);
  const etiqueta = parsearEtiqueta(texto);
  const resultado = await resolver(texto, confianza, contexto);

  await prisma.donacionImagen.update({
    where: { id: imagenId },
    data: {
      estado: DonacionImagenEstado.Procesada,
      textoOcr: resultado.texto,
      confianza: resultado.confianza,
      productoId: resultado.productoId,
      nombreDetectado: etiqueta.nombre,
      cantidadDetectada: etiqueta.cantidad,
      procesadaEn: new Date(),
      error: null,
    },
  });

  log('ocr listo, espera confirmación', {
    imagenId,
    confianza: resultado.confianza,
    nombreDetectado: etiqueta.nombre,
    cantidadDetectada: etiqueta.cantidad,
    productoId: resultado.productoId,
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
  if (texto.trim() === '') {
    return {
      texto: texto || null,
      confianza,
      productoId: null,
      nombreDetectado: null,
      cantidadDetectada: null,
    };
  }

  const productos = (await prisma.producto.findMany({
    select: { id: true, nombre: true, marca: true, categoria: true, ean: true, alias: true },
  })) as Producto[];

  const encontrado =
    confianza >= env.OCR_CONFIANZA_MINIMA
      ? emparejar(texto, productos, UMBRAL_EMPAREJAMIENTO)
      : null;
  return {
    texto,
    confianza,
    productoId: encontrado?.producto.id ?? null,
    nombreDetectado: null,
    cantidadDetectada: null,
  };
}

/**
 * Descarga el objeto por S3 (keys del worker). Un GET a
 * `*.r2.cloudflarestorage.com` sin firma responde 400 y Tesseract nunca corre.
 */
async function descargar(env: Env, pathname: string | undefined): Promise<Buffer> {
  if (!pathname) {
    throw new Error('La imagen no tiene pathname en R2');
  }
  return descargarObjetoR2(env, pathname);
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
