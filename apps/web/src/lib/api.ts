import type { Captcha } from '@soschoco/shared';

const TOKEN_KEY = 'soschoco.token';
const ORG_KEY = 'soschoco.orgId';

// Los contratos y enums del dominio viven en @soschoco/shared. Se reexportan
// aquí para no tocar los imports de las pantallas.
export type {
  Acopio,
  AcopioFlujo,
  AuthSession,
  AuthUser,
  Captcha,
  RegisterPendingVerification,
  GoogleAuthResult,
  GoogleProfilePending,
  InventoryItem,
  Me,
  Member,
  Membership,
  Organization,
  OrganizationTipo,
  Permission,
  Role,
} from '@soschoco/shared';
export {
  ACOPIO_FLUJOS,
  INVENTORY_CATEGORIAS,
  INVENTORY_DESTINATARIOS,
  INVENTORY_ESTADOS,
  INVENTORY_UNIDADES,
  ORGANIZATION_TIPOS,
  PermissionSlug,
  RoleSlug,
} from '@soschoco/shared';

export function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function storeOrgId(id: string): void {
  localStorage.setItem(ORG_KEY, id);
}

export function readStoredOrgId(): string | null {
  return localStorage.getItem(ORG_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    /* cuerpo no JSON */
  }
  return `HTTP ${response.status}`;
}

export async function apiRequest<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function fetchCaptcha(): Promise<Captcha> {
  return apiRequest('/api/v1/auth/captcha', null);
}
