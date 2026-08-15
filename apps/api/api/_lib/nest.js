'use strict';

/**
 * Carga perezosa de la aplicación Nest compilada, con captura de fallos.
 *
 * `src/serverless.ts` ya cachea la app entre invocaciones; aquí solo se
 * envuelve el arranque para que un fallo NO tumbe la función. Sin esto, el
 * error se pierde y la petición termina en FUNCTION_INVOCATION_FAILED sin
 * ninguna pista, que es exactamente lo que /logs viene a resolver.
 *
 * El require es dinámico y va dentro del try: cargar `dist/serverless.js`
 * arrastra `app.module.js`, y ese módulo LANZA en tiempo de carga si falta
 * DATABASE_URL (ConfigModule.forRoot valida al construirse, no al iniciar).
 */

const fs = require('node:fs');
const path = require('node:path');
const logs = require('./log-buffer');

const DIST_ENTRY = path.join(__dirname, '..', '..', 'dist', 'serverless.js');

/** @type {'idle'|'ready'|'failed'} */
let state = 'idle';
let handler = null;
let bootError = null;
let bootPromise = null;
let bootMs = null;

function describeBootError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || String(error),
      at: new Date().toISOString(),
    };
  }
  return {
    name: 'NoError',
    message: typeof error === 'string' ? error : JSON.stringify(error),
    stack: '',
    at: new Date().toISOString(),
  };
}

async function boot() {
  const startedAt = Date.now();
  logs.record('Arrancando la aplicación Nest…', { level: 'info', context: 'Serverless' });

  if (!fs.existsSync(DIST_ENTRY)) {
    throw new Error(
      `No existe el build compilado en ${DIST_ENTRY}. Revisa el buildCommand de vercel.json: debe generar apps/api/dist.`,
    );
  }

  const { obtenerApp } = require(DIST_ENTRY);
  if (typeof obtenerApp !== 'function') {
    throw new Error('dist/serverless.js no exporta obtenerApp()');
  }

  handler = await obtenerApp();
  bootMs = Date.now() - startedAt;
  state = 'ready';
  logs.record(`Aplicación Nest lista en ${bootMs} ms`, { level: 'info', context: 'Serverless' });
}

/**
 * Devuelve el handler de Express de Nest, o null si el arranque falló.
 * El resultado se cachea durante la vida de la instancia.
 */
async function getHandler() {
  if (state === 'ready') return handler;
  if (state === 'failed') return null;

  if (!bootPromise) {
    bootPromise = boot().catch((error) => {
      state = 'failed';
      bootError = describeBootError(error);
      bootMs = null;
      logs.recordError(error, 'BootstrapNest');
    });
  }

  await bootPromise;
  return handler;
}

/** Reintenta el arranque en la siguiente petición (útil tras corregir env vars). */
function reset() {
  state = 'idle';
  handler = null;
  bootError = null;
  bootPromise = null;
  bootMs = null;
  logs.record('Estado de arranque reiniciado; se reintentará en la próxima petición.', {
    level: 'warn',
    context: 'Serverless',
  });
}

function status() {
  return { state, bootError, bootMs, distEntry: DIST_ENTRY, distExists: fs.existsSync(DIST_ENTRY) };
}

module.exports = { getHandler, status, reset };
