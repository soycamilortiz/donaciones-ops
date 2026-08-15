import { Redis } from 'ioredis';

/**
 * BullMQ exige `maxRetriesPerRequest: null` en la conexión del worker: usa
 * comandos bloqueantes y, con el valor por defecto de ioredis, los abortaría.
 */
export function crearConexionRedis(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
