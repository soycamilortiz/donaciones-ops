// Punto de entrada de la funcion serverless en Vercel.
//
// Es JavaScript y no TypeScript a proposito: Vercel compila los entrypoints con
// esbuild, que NO emite metadata de decoradores, y sin ella la inyeccion de
// dependencias de NestJS falla en tiempo de ejecucion. Por eso este archivo solo
// delega en el `dist` que ya compilo `tsc` con `emitDecoratorMetadata`.
//
// La logica de Nest vive en src/serverless.ts.
//
// Ademas expone /logs: un visor publico de los logs de esta instancia. Vive
// FUERA del arranque de Nest y se instala antes que nada, para que siga
// respondiendo aunque la app no levante — que es justo cuando hacen falta.
// Ver _lib/log-buffer.js.
'use strict';

const logs = require('./_lib/log-buffer');
const sharedStream = require('./_lib/shared-log-stream');
logs.attach();

const nest = require('./_lib/nest');
const { renderPage } = require('./_lib/logs-page');
const { collectEnv, checks } = require('./_lib/diagnostics');

/** Si LOGS_TOKEN esta definida, /logs exige ?token=… Si no, es publica. */
const REQUIRED_TOKEN = process.env.LOGS_TOKEN || null;
/** Por debajo del maxDuration de vercel.json (30 s). EventSource reconecta solo. */
const SSE_MAX_MS = 25_000;
const SSE_HEARTBEAT_MS = 10_000;

function send(res, status, contentType, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(payload, null, 2));
}

function autorizado(url) {
  if (!REQUIRED_TOKEN) return true;
  return url.searchParams.get('token') === REQUIRED_TOKEN;
}

function formatLine(entry) {
  const contexto = entry.context ? `[${entry.context}] ` : '';
  return `${entry.ts} ${entry.level.toUpperCase().padEnd(5)} ${contexto}${entry.message}`;
}

/** Modelo compartido por la pagina HTML y /logs/data. */
function buildModel() {
  return { nest: nest.status(), stats: logs.stats(), env: collectEnv(), checks: checks() };
}

function handleStream(req, res, since) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let cursor = since;
  let cerrado = false;

  const flush = () => {
    if (cerrado) return;
    const payload = logs.snapshot(cursor);
    if (payload.entries.length === 0) return;
    cursor = payload.nextSeq;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const finish = () => {
    if (cerrado) return;
    cerrado = true;
    desuscribir();
    clearInterval(latido);
    clearTimeout(limite);
    res.end();
  };

  const desuscribir = logs.subscribe(flush);
  const latido = setInterval(() => {
    if (!cerrado) res.write(': keep-alive\n\n');
  }, SSE_HEARTBEAT_MS);
  const limite = setTimeout(finish, SSE_MAX_MS);

  req.on('close', finish);
  req.on('error', finish);

  flush();
}

async function handleLogs(req, res, url) {
  if (!autorizado(url)) {
    return sendJson(res, 401, {
      error: 'Token requerido',
      detalle: 'Esta instancia tiene LOGS_TOKEN configurado. Anade ?token=… a la URL.',
    });
  }

  const ruta = url.pathname.replace(/^\/_?logs/, '') || '/';
  const since = Number.parseInt(url.searchParams.get('since') || '0', 10) || 0;

  if (ruta === '/' || ruta === '') {
    const token = REQUIRED_TOKEN ? url.searchParams.get('token') : null;
    return send(res, 200, 'text/html; charset=utf-8', renderPage({ ...buildModel(), token }));
  }

  if (ruta === '/data') {
    const limit = Number.parseInt(url.searchParams.get('limit') || '1000', 10) || 1000;
    return sendJson(res, 200, { ...logs.snapshot(since, limit), ...buildModel() });
  }

  if (ruta === '/stream') {
    return handleStream(req, res, since);
  }

  // Every app's entries, not just this instance. `app` filters by emitter.
  if (ruta === '/all') {
    const limit = Number.parseInt(url.searchParams.get('limit') || '500', 10) || 500;
    const app = url.searchParams.get('app');
    const resultado = await sharedStream.readAll(limit);
    const entries = app ? resultado.entries.filter((e) => e.app === app) : resultado.entries;
    return sendJson(res, 200, {
      entries,
      // Non-null when the shared stream could not be read. The page says why
      // instead of showing an empty list that looks like "nothing happened".
      streamError: resultado.error,
      apps: [...new Set(resultado.entries.map((e) => e.app))],
      total: entries.length,
    });
  }

  if (ruta === '/raw') {
    const model = buildModel();
    const cabecera = [
      `# donaciones-ops API — logs de la instancia ${model.stats.instanceId}`,
      `# generado: ${new Date().toISOString()}`,
      `# estado de Nest: ${model.nest.state}`,
      model.nest.bootError ? `# error de arranque: ${model.nest.bootError.message}` : '',
      model.nest.bootError ? model.nest.bootError.stack : '',
      '',
    ]
      .filter(Boolean)
      .join('\n');
    const cuerpo = logs.snapshot(since).entries.map(formatLine).join('\n');
    return send(res, 200, 'text/plain; charset=utf-8', `${cabecera}\n${cuerpo}\n`);
  }

  if (ruta === '/reset') {
    nest.reset();
    return sendJson(res, 200, {
      ok: true,
      detalle: 'Se reintentara arrancar Nest en la proxima peticion.',
    });
  }

  return sendJson(res, 404, {
    error: 'Ruta de logs desconocida',
    disponibles: ['/logs', '/logs/data', '/logs/all', '/logs/stream', '/logs/raw', '/logs/reset'],
  });
}

function esRutaDeLogs(pathname) {
  return (
    pathname === '/logs' ||
    pathname === '/_logs' ||
    pathname.startsWith('/logs/') ||
    pathname.startsWith('/_logs/')
  );
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (esRutaDeLogs(url.pathname)) {
    try {
      return await handleLogs(req, res, url);
    } catch (error) {
      logs.recordError(error, 'VisorDeLogs');
      return sendJson(res, 500, { error: 'El visor de logs fallo', detalle: String(error) });
    }
  }

  const app = await nest.getHandler();

  if (!app) {
    const estado = nest.status();
    return sendJson(res, 503, {
      error: 'La API no esta disponible: la aplicacion Nest no arranco.',
      causa: estado.bootError ? estado.bootError.message : 'desconocida',
      logs: '/logs',
      detalle: 'Abre /logs para ver el stack completo, los chequeos de entorno y los logs en vivo.',
    });
  }

  return app(req, res);
};
