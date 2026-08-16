/**
 * Contract for the shared log stream.
 *
 * The three apps run as separate processes on different hosts, so a viewer can
 * only show all of them if they write somewhere common. Redis is reused rather
 * than adding a log service: all three already connect to it for the queue, so
 * this introduces no new dependency. It also survives a Postgres outage, which
 * is exactly when the logs matter most.
 *
 * This file stays dependency-free on purpose — the web bundle imports from this
 * package too, and must not pull a Redis client along with it.
 */

/** Redis key holding the shared log list. */
export const LOG_STREAM_KEY = 'soschoco:logs';

/** Entries kept in the shared stream. Older ones are trimmed away. */
export const LOG_STREAM_MAX_ENTRIES = 2000;

export const LOG_APPS = ['api', 'worker', 'jobs'] as const;
export type LogApp = (typeof LOG_APPS)[number];

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  /** Which app emitted it. */
  app: LogApp;
  /** Instance that emitted it: serverless spawns one per cold start. */
  instance: string;
  ts: string;
  level: LogLevel;
  /** Nest context or module name, when the line carries one. */
  context: string | null;
  message: string;
};

/** Minimal shape needed from a Redis client, so this file imports none. */
export type LogRedisClient = {
  lpush(key: string, ...values: string[]): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
};

export type LogShipperOptions = {
  client: LogRedisClient;
  app: LogApp;
  instance: string;
  /** Entries beyond this are trimmed. Defaults to LOG_STREAM_MAX_ENTRIES. */
  maxEntries?: number;
};

export type LogShipper = {
  ship(entry: Omit<LogEntry, 'app' | 'instance'>): void;
  /** Failures swallowed so far. Surfaced by the viewer, never logged. */
  readonly failures: number;
};

/**
 * Ships log lines to the shared stream.
 *
 * Fire-and-forget by design: a logger that blocks or throws turns a Redis
 * hiccup into an application outage. Failures are counted and swallowed, and
 * after a few in a row the shipper backs off for a while instead of retrying on
 * every single line.
 *
 * It never logs its own errors — that would recurse through the same path that
 * is already failing.
 */
export function createLogShipper({
  client,
  app,
  instance,
  maxEntries = LOG_STREAM_MAX_ENTRIES,
}: LogShipperOptions): LogShipper {
  const FAILURES_BEFORE_BACKOFF = 5;
  const BACKOFF_MS = 30_000;

  let failures = 0;
  let mutedUntil = 0;
  let sinceTrim = 0;

  return {
    get failures() {
      return failures;
    },

    ship(entry) {
      if (Date.now() < mutedUntil) {
        return;
      }

      const payload: LogEntry = { ...entry, app, instance };

      void (async () => {
        try {
          await client.lpush(LOG_STREAM_KEY, JSON.stringify(payload));

          // Trimming on every line would double the round trips for no gain;
          // the list only needs to stay near the cap, not exactly at it.
          sinceTrim += 1;
          if (sinceTrim >= 50) {
            sinceTrim = 0;
            await client.ltrim(LOG_STREAM_KEY, 0, maxEntries - 1);
          }

          failures = 0;
        } catch {
          failures += 1;
          if (failures >= FAILURES_BEFORE_BACKOFF) {
            mutedUntil = Date.now() + BACKOFF_MS;
            failures = 0;
          }
        }
      })();
    },
  };
}

/**
 * Reads the shared stream, newest first. Returns an empty list rather than
 * throwing: the viewer still has its own in-process buffer to fall back on, and
 * a log page that errors out when the log store is down is useless.
 */
export async function readLogStream(
  client: LogRedisClient,
  limit = 500,
): Promise<{ entries: LogEntry[]; error: string | null }> {
  try {
    const raw = await client.lrange(LOG_STREAM_KEY, 0, Math.max(limit, 1) - 1);
    const entries: LogEntry[] = [];
    for (const line of raw) {
      try {
        entries.push(JSON.parse(line) as LogEntry);
      } catch {
        // A malformed entry should not hide the rest.
      }
    }
    return { entries, error: null };
  } catch (error) {
    return { entries: [], error: error instanceof Error ? error.message : String(error) };
  }
}
