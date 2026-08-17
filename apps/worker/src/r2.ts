import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Env } from './config/env.js';

function clienteR2(env: Env): S3Client | null {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ENDPOINT) {
    return null;
  }
  const endpoint = env.R2_ENDPOINT.replace(/\/+$/, '').replace(
    new RegExp(`/${env.R2_BUCKET}$`),
    '',
  );
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

/** GetObject autenticado. El S3 API no se puede fetch-ear sin firma (HTTP 400). */
export async function descargarObjetoR2(env: Env, key: string): Promise<Buffer> {
  const cliente = clienteR2(env);
  if (!cliente) {
    throw new Error('R2 no configurado en el worker (faltan ACCESS_KEY, SECRET o ENDPOINT)');
  }
  const respuesta = await cliente.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
  if (!respuesta.Body) {
    throw new Error('R2 devolvió un objeto vacío');
  }
  return Buffer.from(await respuesta.Body.transformToByteArray());
}
