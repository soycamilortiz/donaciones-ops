import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { OCR_QUEUE } from '@soschoco/shared';
import { Queue } from 'bullmq';
import express from 'express';
import { Redis } from 'ioredis';
import { basicAuth } from './auth.js';
import { loadConfig } from './config.js';

const config = loadConfig();

const conexion = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

/**
 * Las colas que se muestran en el panel. Al agregar un job nuevo en
 * `apps/worker/src/jobs`, súmalo también aquí para poder observarlo.
 */
const colas = [OCR_QUEUE].map((nombre) => new Queue(nombre, { connection: conexion }));

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

const servidor = app.listen(config.PORT, () => {
  console.log(
    JSON.stringify({
      mensaje: 'panel de jobs arriba',
      puerto: config.PORT,
      ruta: config.JOBS_BASE_PATH,
      colas: colas.map((cola) => cola.name),
    }),
  );
});

async function apagar(senal: string): Promise<void> {
  console.log(JSON.stringify({ mensaje: 'apagando', senal }));
  servidor.close();
  await Promise.all(colas.map((cola) => cola.close()));
  await conexion.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void apagar('SIGTERM'));
process.on('SIGINT', () => void apagar('SIGINT'));
