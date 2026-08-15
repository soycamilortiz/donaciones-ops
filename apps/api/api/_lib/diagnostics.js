'use strict';

/**
 * Panel de diagnóstico del entorno para /logs.
 *
 * Nunca expone valores de variables sensibles: solo si están presentes y su
 * longitud. De DATABASE_URL y REDIS_URL se muestra host y puerto (no son
 * credenciales y son justo lo que hace falta para saber si apuntan al sitio
 * equivocado, que es el fallo más común al pasar de Docker a serverless).
 */

const { describeConnectionUrl } = require('./redact');

/** Variables cuyo valor sí se puede mostrar. */
const PUBLIC_KEYS = [
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',
  'JWT_EXPIRES_IN',
  'RBAC_SYNC_ON_BOOT',
  'SWAGGER_ENABLED',
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_REGION',
  'VERCEL_GIT_COMMIT_REF',
  'VERCEL_GIT_COMMIT_SHA',
];

/** Variables de las que solo se reporta presencia. */
const SECRET_KEYS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'BLOB_READ_WRITE_TOKEN',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'LOGS_TOKEN',
];

function collectEnv() {
  const publicVars = PUBLIC_KEYS.map((key) => ({
    key,
    present: process.env[key] !== undefined,
    value: process.env[key] === undefined ? null : String(process.env[key]).slice(0, 200),
  }));

  const secretVars = SECRET_KEYS.map((key) => {
    const value = process.env[key];
    return {
      key,
      present: typeof value === 'string' && value.length > 0,
      length: typeof value === 'string' ? value.length : 0,
    };
  });

  return {
    publicVars,
    secretVars,
    database: describeConnectionUrl(process.env.DATABASE_URL),
    redis: describeConnectionUrl(process.env.REDIS_URL),
  };
}

const HOSTS_LOCALES = /^(localhost|127\.0\.0\.1|::1|db|postgres|redis)$/i;

/**
 * Chequeos derivados del código real de arranque. Cada uno explica por qué
 * importa, para que un dev que no tenga acceso a Vercel pueda actuar.
 * @returns {Array<{label:string, ok:boolean, detail:string}>}
 */
function checks() {
  const result = [];
  const databaseUrl = process.env.DATABASE_URL;

  result.push({
    label: 'DATABASE_URL definida',
    ok: Boolean(databaseUrl),
    detail: databaseUrl
      ? 'Presente. env.schema.ts la exige sin valor por defecto.'
      : 'FALTA. validateEnv() lanza al cargar app.module.js, antes incluso de construir Nest: la función muere en el require.',
  });

  if (databaseUrl) {
    const info = describeConnectionUrl(databaseUrl);
    const esLocal = info && HOSTS_LOCALES.test(info.host);
    result.push({
      label: 'La base es alcanzable desde Vercel',
      ok: !esLocal,
      detail: esLocal
        ? `Apunta a "${info.host}", que desde una función serverless no existe. PrismaService.onModuleInit() hace $connect() y tumba el arranque completo.`
        : `Host "${info.host}". PrismaService.onModuleInit() hace $connect() al arrancar: si no responde, cae toda la app.`,
    });

    const sinPooler = info && /supabase\.co$/i.test(info.host) && info.port === '5432';
    if (sinPooler) {
      result.push({
        label: 'Conexión a Postgres con pooler',
        ok: false,
        detail:
          'Apunta al puerto 5432 (conexión directa). Cada invocación serverless abre una conexión nueva y Supabase agota el límite. Usa el pooler (puerto 6543, host pooler.supabase.com).',
      });
    }
  }

  const redisInfo = describeConnectionUrl(process.env.REDIS_URL);
  result.push({
    label: 'REDIS_URL apunta fuera de localhost',
    ok: Boolean(redisInfo) && !HOSTS_LOCALES.test(redisInfo.host),
    detail:
      redisInfo && HOSTS_LOCALES.test(redisInfo.host)
        ? `Usa el valor por defecto ("${redisInfo.host}"), inalcanzable desde Vercel. La conexión es perezosa, así que no tumba el arranque, pero la cola de donaciones fallará al usarse.`
        : `Host "${redisInfo ? redisInfo.host : '(sin definir)'}".`,
  });

  result.push({
    label: 'RBAC_SYNC_ON_BOOT desactivado',
    ok: process.env.RBAC_SYNC_ON_BOOT === 'false',
    detail:
      process.env.RBAC_SYNC_ON_BOOT === 'false'
        ? 'Correcto en serverless. Sincroniza con `pnpm --filter api rbac:sync` tras cada despliegue.'
        : 'En serverless escribe ~20 filas en CADA arranque en frío: retrasa la primera petición y tumba la función si la base no responde. Ponlo en "false".',
  });

  result.push({
    label: 'SWAGGER_ENABLED desactivado',
    ok: process.env.SWAGGER_ENABLED === 'false',
    detail:
      process.env.SWAGGER_ENABLED === 'false'
        ? 'Correcto en serverless.'
        : 'Swagger recorre toda la metadata en cada arranque en frío. Ponlo en "false" en producción salvo que necesites /api/docs.',
  });

  const jwtSecret = process.env.JWT_SECRET;
  result.push({
    label: 'JWT_SECRET propio',
    ok: Boolean(jwtSecret) && jwtSecret !== 'soschoco-dev-jwt-secret-cambia-esto',
    detail: !jwtSecret
      ? 'Sin definir: usa el valor por defecto del repo, que es público.'
      : jwtSecret === 'soschoco-dev-jwt-secret-cambia-esto'
        ? 'Es el valor de ejemplo del repo. Cámbialo antes de exponer la API.'
        : 'Definido con un valor propio.',
  });

  return result;
}

module.exports = { collectEnv, checks };
