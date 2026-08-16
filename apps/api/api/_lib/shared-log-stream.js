/**
 * Bridge between the API's in-process log buffer and the shared Redis stream.
 *
 * The buffer in log-buffer.js only ever sees this instance. To show the worker
 * and the jobs panel in the same viewer they all have to write somewhere
 * common, and Redis is what all three already connect to for the queue — so
 * this adds no dependency that was not already required.
 *
 * Everything here degrades quietly. If Redis is unreachable the viewer still
 * shows the local buffer, which is the behaviour that existed before. A log
 * viewer that breaks when the log store is down helps nobody.
 */

const { createLogShipper, readLogStream } = require('@soschoco/shared');

const REDIS_URL = process.env.REDIS_URL;

/** Built lazily: most requests never touch the log stream. */
let client = null;
let clientError = null;
let shipper = null;

function getClient() {
  if (client || clientError) {
    return client;
  }
  if (!REDIS_URL) {
    clientError = 'REDIS_URL no está definida';
    return null;
  }
  try {
    // Required lazily so a missing dependency cannot break the whole function.
    const { Redis } = require('ioredis');
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      // The offline queue stays ON so the boot lines — the ones that explain a
      // failed start, the whole reason this viewer exists — are not dropped for
      // arriving before the socket is up. Writes are fire-and-forget so they
      // never delay a response; reads get their own timeout below.
      enableOfflineQueue: true,
      lazyConnect: false,
      // Stop reconnecting after the first failure: queued commands are then
      // rejected and swallowed, instead of piling up in memory forever.
      retryStrategy: () => null,
    });
    // ioredis emits 'error' on an unreachable host; unhandled it would crash.
    client.on('error', (error) => {
      clientError = error.message;
    });
  } catch (error) {
    clientError = error instanceof Error ? error.message : String(error);
  }
  return client;
}

/** Starts mirroring this instance's entries into the shared stream. */
function attachShipper(instanceId) {
  const redis = getClient();
  if (!redis) {
    return null;
  }
  shipper = createLogShipper({ client: redis, app: 'api', instance: instanceId });
  return shipper;
}

function ship(entry) {
  if (shipper) {
    shipper.ship(entry);
  }
}

/**
 * Reads every app's entries, newest first. `error` is non-null when the stream
 * could not be read, so the page can say why instead of showing an empty list
 * that looks like "nothing happened".
 */
async function readAll(limit) {
  const redis = getClient();
  if (!redis) {
    return { entries: [], error: clientError || 'Redis no configurado' };
  }
  // A read blocks the HTTP response, so it gets a hard ceiling. Without it an
  // unreachable Redis would hang the function until the platform times out and
  // returns nothing at all.
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve({ entries: [], error: 'Redis no respondió en 3s' }), 3000),
  );
  const result = await Promise.race([readLogStream(redis, limit), timeout]);
  return { entries: result.entries, error: result.error || clientError };
}

module.exports = { attachShipper, ship, readAll };
