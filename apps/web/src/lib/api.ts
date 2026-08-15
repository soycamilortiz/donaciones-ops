const TOKEN_KEY = 'soschoco.token';
const ORG_KEY = 'soschoco.orgId';

export type Membership = {
  id: string;
  isPrimary: boolean;
  role: { id: string; slug: string; nombre: string };
  organization: { id: string; nombre: string; tipo: string };
  permissions: string[];
};

export type Me = {
  id: string;
  usuario: string;
  nombre: string;
  correo: string;
  memberships: Membership[];
};

export type AuthUser = {
  id: string;
  usuario: string;
  nombre: string;
  correo: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type Member = {
  membershipId: string;
  userId: string;
  usuario: string;
  nombre: string;
  correo: string;
  isPrimary: boolean;
  roleSlug: string;
  roleNombre: string;
};

export type Role = {
  id: string;
  slug: string;
  nombre: string;
  descripcion?: string | null;
  permissions: { slug: string; nombre: string; descripcion?: string | null }[];
};

export type Permission = {
  slug: string;
  nombre: string;
  descripcion?: string | null;
};

export type Acopio = {
  id: string;
  nombre: string;
  telefono?: string | null;
  descripcion?: string | null;
  municipio?: string | null;
  direccion?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export const ORGANIZATION_TIPOS = [
  { value: 'CENTRO_ACOPIO', label: 'Centro de acopio' },
  { value: 'RESCATE', label: 'Rescate' },
  { value: 'OLLA_COMUNITARIA', label: 'Olla comunitaria' },
  { value: 'INSTITUCION', label: 'Institución' },
  { value: 'OTRO', label: 'Otro' },
] as const;

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

export async function fetchCaptcha(): Promise<{ captchaId: string; svg: string }> {
  return apiRequest('/api/v1/auth/captcha', null);
}
