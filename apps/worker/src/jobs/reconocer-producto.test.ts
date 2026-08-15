import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { DonacionImagenEstado } from '@soschoco/shared';
import { loadEnv } from '../config/env.js';
import { type Efectos, procesarImagen } from './reconocer-producto.js';
import type { ContextoJob } from './tipos.js';

const ENV = loadEnv({
  DATABASE_URL: 'postgresql://x:x@localhost:5432/x',
  REDIS_URL: 'redis://localhost:6379',
  OCR_CONFIANZA_MINIMA: '0.6',
} as NodeJS.ProcessEnv);

const PRODUCTOS = [
  {
    id: 'p1',
    nombre: 'Crema dental Colgate',
    marca: 'Colgate',
    categoria: null,
    ean: null,
    alias: ['colgate'],
  },
];

type Escritura = Record<string, unknown>;

/** Prisma simulado: solo lo que toca este job. */
function prismaFalso(estadoInicial: string) {
  const escrituras: Escritura[] = [];
  const prisma = {
    donacionImagen: {
      findUnique: async () => ({
        id: 'img-1',
        blobUrl: 'https://blob.example/img-1.jpg',
        estado: estadoInicial,
      }),
      update: async ({ data }: { data: Escritura }) => {
        escrituras.push(data);
        return data;
      },
      updateMany: async ({ data }: { data: Escritura }) => {
        escrituras.push(data);
        return { count: 1 };
      },
    },
    producto: {
      findMany: async () => PRODUCTOS,
    },
  } as unknown as PrismaClient;

  return { prisma, escrituras };
}

function contexto(prisma: PrismaClient): ContextoJob {
  return { prisma, env: ENV, log: () => {} };
}

const efectos = (texto: string, confianza: number): Efectos => ({
  descargar: async () => Buffer.from('imagen falsa'),
  reconocerTexto: async () => ({ texto, confianza }),
});

test('relaciona la imagen con el producto reconocido', async () => {
  const { prisma, escrituras } = prismaFalso(DonacionImagenEstado.Pendiente);
  await procesarImagen('img-1', contexto(prisma), efectos('CREMA DENTAL COLGATE', 0.9));

  const final = escrituras.at(-1);
  assert.equal(final?.estado, DonacionImagenEstado.Procesada);
  assert.equal(final?.productoId, 'p1');
  assert.equal(final?.confianza, 0.9);
});

test('con confianza baja guarda el texto pero no el producto', async () => {
  const { prisma, escrituras } = prismaFalso(DonacionImagenEstado.Pendiente);
  await procesarImagen('img-1', contexto(prisma), efectos('CREMA DENTAL COLGATE', 0.3));

  const final = escrituras.at(-1);
  assert.equal(final?.estado, DonacionImagenEstado.Procesada);
  assert.equal(final?.productoId, null, 'un producto dudoso no debe entrar al inventario');
  assert.equal(final?.textoOcr, 'CREMA DENTAL COLGATE');
});

test('texto que no está en el catálogo deja la imagen para revisión', async () => {
  const { prisma, escrituras } = prismaFalso(DonacionImagenEstado.Pendiente);
  await procesarImagen('img-1', contexto(prisma), efectos('OBJETO DESCONOCIDO', 0.95));

  assert.equal(escrituras.at(-1)?.productoId, null);
});

test('no reprocesa una imagen ya procesada', async () => {
  const { prisma, escrituras } = prismaFalso(DonacionImagenEstado.Procesada);
  await procesarImagen('img-1', contexto(prisma), efectos('COLGATE', 0.9));

  assert.equal(escrituras.length, 0, 'el job debe ser idempotente');
});

test('marca PROCESANDO y suma un intento antes de trabajar', async () => {
  const { prisma, escrituras } = prismaFalso(DonacionImagenEstado.Pendiente);
  await procesarImagen('img-1', contexto(prisma), efectos('COLGATE', 0.9));

  assert.equal(escrituras[0]?.estado, DonacionImagenEstado.Procesando);
  assert.deepEqual(escrituras[0]?.intentos, { increment: 1 });
});

test('propaga el fallo de descarga para que BullMQ reintente', async () => {
  const { prisma } = prismaFalso(DonacionImagenEstado.Pendiente);
  const rotos: Efectos = {
    descargar: async () => {
      throw new Error('HTTP 404');
    },
    reconocerTexto: async () => ({ texto: '', confianza: 0 }),
  };

  await assert.rejects(() => procesarImagen('img-1', contexto(prisma), rotos), /HTTP 404/);
});
