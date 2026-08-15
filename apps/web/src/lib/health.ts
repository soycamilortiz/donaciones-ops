export type HealthStatus = 'checking' | 'ok' | 'down';

export type ApiHealth = {
  liveness: HealthStatus;
  readiness: HealthStatus;
};

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchApiHealth(): Promise<ApiHealth> {
  const result: ApiHealth = { liveness: 'down', readiness: 'down' };

  try {
    const live = (await getJson('/api/health')) as { status?: string };
    result.liveness = live.status === 'ok' ? 'ok' : 'down';
  } catch {
    result.liveness = 'down';
  }

  try {
    const ready = (await getJson('/api/health/ready')) as { status?: string };
    result.readiness = ready.status === 'ok' ? 'ok' : 'down';
  } catch {
    result.readiness = 'down';
  }

  return result;
}
