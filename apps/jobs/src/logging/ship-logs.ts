import { hostname } from 'node:os';
import {
  createLogShipper,
  type LogApp,
  type LogLevel,
  type LogRedisClient,
} from '@soschoco/shared';

/**
 * Mirrors this process's stdout and stderr into the shared log stream, so
 * `/logs` on the API can show the worker's output alongside its own.
 *
 * stdout/stderr are patched rather than `console.*` because that catches
 * everything at one point: console calls, and anything a dependency writes
 * straight to the stream.
 *
 * Local output is never suppressed — the original write always runs first, so
 * `docker logs` and the terminal keep working exactly as before.
 */
export function shipLogsToStream(client: LogRedisClient, app: LogApp): () => void {
  const instance = `${hostname()}-${process.pid}`;
  const shipper = createLogShipper({ client, app, instance });

  const restores: Array<() => void> = [];

  for (const [name, stream] of [
    ['stdout', process.stdout],
    ['stderr', process.stderr],
  ] as const) {
    const original = stream.write.bind(stream);

    stream.write = ((chunk: unknown, ...rest: unknown[]) => {
      // Write locally first: shipping must never delay or swallow the real output.
      const result = (original as (...args: unknown[]) => boolean)(chunk, ...rest);

      const text = typeof chunk === 'string' ? chunk : String(chunk);
      const message = text.trimEnd();
      if (message !== '') {
        shipper.ship({
          ts: new Date().toISOString(),
          level: inferLevel(message, name),
          context: inferContext(message),
          message: message.slice(0, 8000),
        });
      }
      return result;
    }) as typeof stream.write;

    restores.push(() => {
      stream.write = original as typeof stream.write;
    });
  }

  return () => {
    for (const restore of restores) {
      restore();
    }
  };
}

const LEVEL_TAG = /\b(FATAL|ERROR|WARN|DEBUG|VERBOSE|LOG|INFO)\b/;

function inferLevel(text: string, stream: 'stdout' | 'stderr'): LogLevel {
  const tag = LEVEL_TAG.exec(text);
  if (tag?.[1]) {
    const found = tag[1].toUpperCase();
    if (found === 'ERROR' || found === 'FATAL') return 'error';
    if (found === 'WARN') return 'warn';
    if (found === 'DEBUG' || found === 'VERBOSE') return 'debug';
  }
  return stream === 'stderr' ? 'error' : 'info';
}

/** The worker logs JSON lines, so the message field carries the useful context. */
function inferContext(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { cola?: string; mensaje?: string };
    return parsed.cola ?? (parsed.mensaje ? 'worker' : null);
  } catch {
    return null;
  }
}
