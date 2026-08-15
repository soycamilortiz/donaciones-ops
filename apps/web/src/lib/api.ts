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
  isActive: boolean;
  roleSlug: string;
  roleNombre: string;
};

export type Role = {
  id: string;
  slug: string;
  nombre: string;
  descripcion?: string | null;
  isActive: boolean;
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
  flujo: 'RECIBIR' | 'ENVIAR' | 'AMBOS';
  telefono?: string | null;
  descripcion?: string | null;
  municipio?: string | null;
  direccion?: string | null;
  lat?: number | null;
  lng?: number | null;
  isActive: boolean;
};

export const ACOPIO_FLUJOS = [
  { value: 'RECIBIR', label: 'Recibir donaciones' },
  { value: 'ENVIAR', label: 'Enviar donaciones' },
  { value: 'AMBOS', label: 'Recibir y enviar' },
] as const;

export type InventoryItem = {
  id: string;
  acopioId: string;
  nombre: string;
  categoria: string;
  categoriaDetalle?: string | null;
  sku?: string | null;
  marca?: string | null;
  presentacion?: string | null;
  talla?: string | null;
  destinatario: string;
  cantidad: number;
  unidad: string;
  unidadDetalle?: string | null;
  vencimiento?: string | null;
  estado: string;
  loteCodigo?: string | null;
  ubicacionInterna?: string | null;
  donanteNombre?: string | null;
  donanteContacto?: string | null;
  observaciones?: string | null;
  isActive: boolean;
};

export const INVENTORY_CATEGORIAS = [
  { value: 'ALIMENTOS_NO_PERECEDEROS', label: 'Alimentos no perecederos' },
  { value: 'AGUA', label: 'Agua' },
  { value: 'ASEO_HIGIENE', label: 'Aseo e higiene' },
  { value: 'PANALES_BEBE', label: 'Pañales y elementos de bebé' },
  { value: 'MEDICAMENTOS', label: 'Medicamentos y primeros auxilios' },
  { value: 'ROPA_CALZADO', label: 'Prendas de vestir y calzado' },
  { value: 'COLCHONETAS_COBIJAS', label: 'Colchonetas, cobijas y abrigo' },
  { value: 'ALIMENTO_MASCOTAS', label: 'Alimento para mascotas' },
  { value: 'MEDICAMENTO_MASCOTAS', label: 'Medicamento para mascotas' },
  { value: 'LOGISTICA_RESCATE', label: 'Logística, emergencia y rescate' },
  { value: 'MENAJE_COCINA', label: 'Menaje y utensilios de cocina' },
  { value: 'DESECHABLES', label: 'Desechables' },
  { value: 'OTRO', label: 'Otro' },
] as const;

export const INVENTORY_UNIDADES = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'LIBRA', label: 'Libra' },
  { value: 'KILO', label: 'Kilo' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'BOTELLA', label: 'Botella' },
  { value: 'LATA', label: 'Lata' },
  { value: 'PAQUETE', label: 'Paquete' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'GALON', label: 'Galón' },
  { value: 'FRASCO', label: 'Frasco' },
  { value: 'TABLETA', label: 'Tableta' },
  { value: 'DOCENA', label: 'Docena' },
  { value: 'OTRO', label: 'Otra unidad' },
] as const;

export const INVENTORY_ESTADOS = [
  { value: 'NUEVO', label: 'Nuevo' },
  { value: 'BUEN_ESTADO', label: 'Buen estado' },
  { value: 'USADO', label: 'Usado' },
  { value: 'PROXIMO_A_VENCER', label: 'Próximo a vencer' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'NO_APLICA', label: 'No aplica' },
] as const;

export const INVENTORY_DESTINATARIOS = [
  { value: 'NO_APLICA', label: 'No aplica' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'MUJER', label: 'Mujer' },
  { value: 'HOMBRE', label: 'Hombre' },
  { value: 'NINO', label: 'Niño' },
  { value: 'NINA', label: 'Niña' },
  { value: 'BEBE', label: 'Bebé' },
  { value: 'MASCOTA', label: 'Mascota' },
] as const;

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
