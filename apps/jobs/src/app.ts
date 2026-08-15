import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { OCR_QUEUE } from '@soschoco/shared';
import { Queue } from 'bullmq';
import express, { type Express } from 'express';
import { Redis } from 'ioredis';
import { basicAuth } from './auth.js';
import type { Config } from './config.js';

/**
 * Las colas que se muestran en el panel. Al agregar un job nuevo en
 * `apps/worker/src/jobs`, súmalo también aquí para poder observarlo.
 */
const NOMBRES_DE_COLA = [OCR_QUEUE];

export type PanelCreado = {
  app: Express;
  cerrar: () => Promise<void>;
  colas: string[];
};

/**
 * Construye el panel sin escuchar en ningún puerto. Se separa de `main.ts`
 * para que la misma app sirva a un proceso de larga vida y a una función
 * serverless, donde quien escucha es el runtime.
 */
export function crearPanel(config: Config): PanelCreado {
  const conexion = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 5_000,
  });

  const colas = NOMBRES_DE_COLA.map((nombre) => new Queue(nombre, { connection: conexion }));

  const adaptador = new ExpressAdapter();
  adaptador.setBasePath(config.JOBS_BASE_PATH);

  createBullBoard({
    queues: colas.map((cola) => new BullMQAdapter(cola)),
    serverAdapter: adaptador,
  });

  const app = express();

  // Sirve para el healthcheck del contenedor, así que va antes de la autenticación.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', colas: colas.map((cola) => cola.name) });
  });

  app.use(config.JOBS_BASE_PATH, basicAuth(config.JOBS_USER, config.JOBS_PASSWORD));
  app.use(config.JOBS_BASE_PATH, adaptador.getRouter());

  return {
    app,
    colas: colas.map((cola) => cola.name),
    cerrar: async () => {
      await Promise.all(colas.map((cola) => cola.close()));
      await conexion.quit();
    },
  };
}
