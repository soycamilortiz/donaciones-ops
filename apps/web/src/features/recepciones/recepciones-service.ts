import type { Recepcion } from '@soschoco/shared';

export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

const base = (orgId: string) => `/api/v1/organizations/${orgId}/recepciones`;

export function listarRecepciones(request: Peticion, orgId: string): Promise<Recepcion[]> {
  return request<Recepcion[]>(base(orgId));
}

export function obtenerRecepcion(request: Peticion, orgId: string, id: string): Promise<Recepcion> {
  return request<Recepcion>(`${base(orgId)}/${id}`);
}

export function crearRecepcion(
  request: Peticion,
  orgId: string,
  body: {
    acopioId: string;
    tipo: string;
    presentacionFisica: string;
    donanteNombre?: string;
    donanteContacto?: string;
    procedencia?: string;
    transportista?: string;
    vehiculoPlaca?: string;
    documentoTransporte?: string;
    observaciones?: string;
    cantidadUnidades?: number;
    tipoUnidad?: string;
  },
): Promise<Recepcion> {
  return request<Recepcion>(base(orgId), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function generarUnidades(
  request: Peticion,
  orgId: string,
  id: string,
  body: { tipo: string; cantidad: number },
): Promise<Recepcion> {
  return request<Recepcion>(`${base(orgId)}/${id}/unidades`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function agregarItemManual(
  request: Peticion,
  orgId: string,
  id: string,
  body: {
    nombre: string;
    cantidad: number;
    marca?: string;
    productoId?: string;
    unidadLogisticaId?: string;
    loteCodigoOrigen?: string;
    vencimiento?: string;
    observaciones?: string;
  },
): Promise<Recepcion> {
  return request<Recepcion>(`${base(orgId)}/${id}/items`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function inspeccionarItem(
  request: Peticion,
  orgId: string,
  id: string,
  itemId: string,
  body: {
    cantidadAprobada: number;
    cantidadCuarentena: number;
    cantidadRechazada: number;
    observaciones?: string;
  },
): Promise<Recepcion> {
  return request<Recepcion>(`${base(orgId)}/${id}/items/${itemId}/inspeccion`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function validarRecepcion(request: Peticion, orgId: string, id: string): Promise<Recepcion> {
  return request<Recepcion>(`${base(orgId)}/${id}/validar`, { method: 'POST' });
}

export function anularRecepcion(request: Peticion, orgId: string, id: string): Promise<Recepcion> {
  return request<Recepcion>(`${base(orgId)}/${id}/anular`, { method: 'POST' });
}
