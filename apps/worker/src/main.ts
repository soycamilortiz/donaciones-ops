import { PrismaClient } from '@prisma/client';
import { loadEnv } from './config/env.js';
import { JOBS } from './jobs/registro.js';
import { shipLogsToStream } from './logging/ship-logs.js';
import { JobManager } from './manager.js';
import { crearConexionRedis } from './queue/conexion.js';

const env = loadEnv();
const prisma = new PrismaClient();
const conexion = crearConexionRedis(env.REDIS_URL);

// Mirror this process's output into the shared stream so /logs on the API can
// show it. Reuses the queue connection: no extra client, no new dependency.
const detenerEnvioDeLogs = shipLogsToStream(conexion, 'worker');

function log(mensaje: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), mensaje, ...extra }));
}

const manager = new JobManager({ jobs: JOBS, prisma, conexion, env, log });
manager.iniciar();

log('worker arriba', { jobs: JOBS.length });

let apagando = false;

async function apagar(senal: string): Promise<void> {
  if (apagando) {
    return;
  }
  apagando = true;
  log('apagando', { senal });
  detenerEnvioDeLogs();
  await manager.detener();
  await conexion.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void apagar('SIGTERM'));
process.on('SIGINT', () => void apagar('SIGINT'));
