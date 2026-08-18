import type { InventoryItem, InventoryMovimiento, Putaway, Ubicacion } from '@soschoco/shared';

export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

const base = (orgId: string, acopioId: string) =>
  `/api/v1/organizations/${orgId}/acopios/${acopioId}`;

export function listarUbicaciones(
  request: Peticion,
  orgId: string,
  acopioId: string,
): Promise<Ubicacion[]> {
  return request<Ubicacion[]>(`${base(orgId, acopioId)}/ubicaciones`);
}

export function crearUbicacion(
  request: Peticion,
  orgId: string,
  acopioId: string,
  body: {
    codigo: string;
    nombre: string;
    tipo: string;
    funcion: string;
    parentId?: string;
    capacidadUnidades?: number;
    zonaTemperatura?: string;
    permiteAlimentos?: boolean;
    permiteMedicamentos?: boolean;
    permiteRopa?: boolean;
  },
): Promise<Ubicacion> {
  return request<Ubicacion>(`${base(orgId, acopioId)}/ubicaciones`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function actualizarUbicacion(
  request: Peticion,
  orgId: string,
  acopioId: string,
  id: string,
  body: {
    nombre?: string;
    tipo?: string;
    funcion?: string;
    parentId?: string | null;
    capacidadUnidades?: number | null;
    zonaTemperatura?: string | null;
    permiteAlimentos?: boolean;
    permiteMedicamentos?: boolean;
    permiteRopa?: boolean;
  },
): Promise<Ubicacion> {
  return request<Ubicacion>(`${base(orgId, acopioId)}/ubicaciones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function darBajaUbicacion(
  request: Peticion,
  orgId: string,
  acopioId: string,
  id: string,
): Promise<void> {
  return request<void>(`${base(orgId, acopioId)}/ubicaciones/${id}`, { method: 'DELETE' });
}

export function listarPendientesUbicar(
  request: Peticion,
  orgId: string,
  acopioId: string,
): Promise<InventoryItem[]> {
  return request<InventoryItem[]>(`${base(orgId, acopioId)}/putaway/pendientes`);
}

export type PlanPutaway = {
  cantidad: number;
  sugeridas: Array<Ubicacion & { compatible: boolean; motivo?: string | null }>;
  plan: Array<{ ubicacionId: string; codigo: string; cantidad: number }>;
};

export function sugerirUbicaciones(
  request: Peticion,
  orgId: string,
  acopioId: string,
  itemId: string,
  cantidad?: number,
): Promise<PlanPutaway> {
  const q = cantidad ? `?cantidad=${cantidad}` : '';
  return request<PlanPutaway>(`${base(orgId, acopioId)}/putaway/sugerencias/${itemId}${q}`);
}

export function crearPutaway(
  request: Peticion,
  orgId: string,
  acopioId: string,
  itemId: string,
  lineas: Array<{ destinoUbicacionId: string; cantidad: number }>,
): Promise<Putaway> {
  return request<Putaway>(`${base(orgId, acopioId)}/putaway/${itemId}`, {
    method: 'POST',
    body: JSON.stringify({ lineas }),
  });
}

export function confirmarPutaway(
  request: Peticion,
  orgId: string,
  acopioId: string,
  putawayId: string,
  lineas: Array<{ lineaId: string; codigoDestino: string }>,
): Promise<Putaway> {
  return request<Putaway>(`${base(orgId, acopioId)}/putaway/tareas/${putawayId}/confirmar`, {
    method: 'POST',
    body: JSON.stringify({ lineas }),
  });
}

export function listarMovimientos(
  request: Peticion,
  orgId: string,
  acopioId: string,
  opts?: { itemId?: string; limite?: number },
): Promise<InventoryMovimiento[]> {
  const q = new URLSearchParams();
  if (opts?.itemId) {
    q.set('itemId', opts.itemId);
  }
  if (opts?.limite) {
    q.set('limite', String(opts.limite));
  }
  const qs = q.toString();
  return request<InventoryMovimiento[]>(
    `${base(orgId, acopioId)}/movimientos${qs ? `?${qs}` : ''}`,
  );
}

export function reubicarInventario(
  request: Peticion,
  orgId: string,
  acopioId: string,
  body: {
    inventoryItemId: string;
    origenUbicacionId: string;
    destinoUbicacionId: string;
    cantidad: number;
    codigoDestino: string;
    observaciones?: string;
  },
): Promise<InventoryMovimiento> {
  return request<InventoryMovimiento>(`${base(orgId, acopioId)}/movimientos`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
