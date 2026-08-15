/**
 * Buffer circular de logs en memoria para el visor público (/logs).
 *
 * Intercepta process.stdout/stderr en lugar de console.* porque el
 * ConsoleLogger de Nest escribe directo al stream: parcheando el stream
 * capturamos console.*, los logs de Nest y los de cualquier dependencia
 * con un único punto de intercepción.
 */

const { redact } = require('./redact');

const MAX_ENTRIES = Number(process.env.LOGS_BUFFER_SIZE || 1000) || 1000;
const MAX_LINE_LENGTH = 8000;

/** @type {Array<{seq:number,ts:string,level:string,stream:string,context:string|null,message:string}>} */
const entries = [];
const subscribers = new Set();

let seq = 0;
let attached = false;

/** Identifica la instancia serverless: cada una tiene su propio buffer. */
const instanceId = `${process.env.VERCEL_REGION || 'local'}-${process.pid}-${Math.floor(process.uptime() * 1000)}`;
const startedAt = new Date().toISOString();

const LEVEL_TAG = /\b(FATAL|ERROR|WARN|DEBUG|VERBOSE|LOG|INFO)\b/;
const NEST_CONTEXT = /\[([A-Za-z0-9_.:-]{2,60})\]/;

function inferLevel(text, stream) {
  const tag = LEVEL_TAG.exec(text);
  if (tag) {
    const found = tag[1].toUpperCase();
    if (found === 'LOG' || found === 'INFO') return stream === 'stderr' ? 'warn' : 'info';
    if (found === 'VERBOSE') return 'debug';
    return found.toLowerCase();
  }
  return stream === 'stderr' ? 'error' : 'info';
}

function inferContext(text) {
  const match = NEST_CONTEXT.exec(text);
  if (!match) return null;
  // [Nest] es el prefijo del logger, no el contexto real.
  return match[1] === 'Nest' ? null : match[1];
}

/**
 * Registra una línea en el buffer. El texto se redacta ANTES de almacenarse.
 * @param {string} rawMessage
 * @param {{stream?:string, level?:string, context?:string|null}} [options]
 */
function record(rawMessage, options = {}) {
  const stream = options.stream || 'stdout';
  const safe = redact(rawMessage);

  for (const line of safe.split('\n')) {
    if (!line.trim()) continue;

    seq += 1;
    entries.push({
      seq,
      ts: new Date().toISOString(),
      level: options.level || inferLevel(line, stream),
      stream,
      context: options.context !== undefined ? options.context : inferContext(line),
      message:
        line.length > MAX_LINE_LENGTH ? `${line.slice(0, MAX_LINE_LENGTH)}… [truncado]` : line,
    });

    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  }

  notify();
}

/**
 * Registra un Error con su stack completo, sin pasar por stdout.
 * @param {unknown} error
 * @param {string} context
 */
function recordError(error, context) {
  const parts = [];
  let current = error;
  let depth = 0;

  while (current && depth < 5) {
    if (current instanceof Error) {
      parts.push(current.stack || `${current.name}: ${current.message}`);
      // Postgres y Prisma cuelgan datos útiles fuera de message/stack.
      for (const key of ['code', 'errno', 'syscall', 'address', 'port', 'clientVersion', 'meta']) {
        if (current[key] !== undefined) {
          parts.push(
            `  ${key}: ${typeof current[key] === 'object' ? JSON.stringify(current[key]) : current[key]}`,
          );
        }
      }
      current = current.cause;
      if (current) parts.push('Causado por:');
    } else {
      parts.push(typeof current === 'object' ? JSON.stringify(current, null, 2) : String(current));
      current = null;
    }
    depth += 1;
  }

  record(parts.join('\n'), { stream: 'stderr', level: 'fatal', context });
}

function notify() {
  if (subscribers.size === 0) return;
  for (const subscriber of subscribers) {
    try {
      subscriber();
    } catch {
      subscribers.delete(subscriber);
    }
  }
}

/**
 * Parchea stdout/stderr y los manejadores globales de error.
 * Idempotente: llamarlo varias veces no duplica la captura.
 */
function attach() {
  if (attached) return;
  attached = true;

  for (const name of ['stdout', 'stderr']) {
    const stream = process[name];
    const original = stream.write.bind(stream);

    stream.write = (chunk, encoding, callback) => {
      try {
        const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
        record(text, { stream: name });
      } catch {
        // Nunca dejamos que la captura rompa una escritura real.
      }
      return original(chunk, encoding, callback);
    };
  }

  process.on('uncaughtException', (error) => recordError(error, 'uncaughtException'));
  process.on('unhandledRejection', (reason) => recordError(reason, 'unhandledRejection'));

  record(`Captura de logs activa · instancia ${instanceId} · buffer ${MAX_ENTRIES} líneas`, {
    level: 'info',
    context: 'LogBuffer',
  });
}

/**
 * Devuelve las entradas posteriores a `since`.
 * @param {number} since
 * @param {number} [limit]
 */
function snapshot(since = 0, limit = MAX_ENTRIES) {
  const slice = entries.filter((entry) => entry.seq > since);
  const trimmed = slice.length > limit ? slice.slice(slice.length - limit) : slice;
  return {
    entries: trimmed,
    nextSeq: seq,
    dropped: since > 0 && slice.length > 0 && slice[0].seq > since + 1,
    total: entries.length,
  };
}

/**
 * Suscribe un callback que se dispara con cada línea nueva (para SSE).
 * @param {() => void} fn
 * @returns {() => void} función para cancelar la suscripción
 */
function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function stats() {
  return {
    instanceId,
    startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    buffered: entries.length,
    capacity: MAX_ENTRIES,
    lastSeq: seq,
    node: process.version,
    region: process.env.VERCEL_REGION || null,
  };
}

module.exports = { attach, record, recordError, snapshot, subscribe, stats, instanceId };
