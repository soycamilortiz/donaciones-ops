import type { Demanda, Kit, PlanEscaso, Reserva, SimulacionReserva } from '@soschoco/shared';

export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

const org = (orgId: string) => `/api/v1/organizations/${orgId}`;

export function listarCatalogoProductos(
  request: Peticion,
  orgId: string,
): Promise<Array<{ id: string; nombre: string; sku: string }>> {
  return request(`${org(orgId)}/catalogo/productos`);
}

export function listarKits(request: Peticion, orgId: string): Promise<Kit[]> {
  return request<Kit[]>(`${org(orgId)}/kits`);
}

export function crearKit(
  request: Peticion,
  orgId: string,
  body: {
    nombre: string;
    codigo?: string;
    descripcion?: string;
    componentes?: Array<{ productoId: string; cantidad: number }>;
  },
): Promise<Kit> {
  return request<Kit>(`${org(orgId)}/kits`, { method: 'POST', body: JSON.stringify(body) });
}

export function agregarComponenteKit(
  request: Peticion,
  orgId: string,
  kitId: string,
  productoId: string,
  cantidad: number,
): Promise<Kit> {
  return request<Kit>(`${org(orgId)}/kits/${kitId}/componentes`, {
    method: 'POST',
    body: JSON.stringify({ productoId, cantidad }),
  });
}

export function quitarComponenteKit(
  request: Peticion,
  orgId: string,
  kitId: string,
  componenteId: string,
): Promise<Kit> {
  return request<Kit>(`${org(orgId)}/kits/${kitId}/componentes/${componenteId}`, {
    method: 'DELETE',
  });
}

export function darBajaKit(request: Peticion, orgId: string, kitId: string): Promise<void> {
  return request<void>(`${org(orgId)}/kits/${kitId}`, { method: 'DELETE' });
}

export function listarDemandas(request: Peticion, orgId: string): Promise<Demanda[]> {
  return request<Demanda[]>(`${org(orgId)}/demandas`);
}

export function getDemanda(request: Peticion, orgId: string, id: string): Promise<Demanda> {
  return request<Demanda>(`${org(orgId)}/demandas/${id}`);
}

export function crearDemanda(
  request: Peticion,
  orgId: string,
  body: {
    acopioId: string;
    destinoNombre: string;
    destinoMunicipio?: string;
    destinoDepartamento?: string;
    prioridad?: string;
    fechaRequerida?: string;
    poblacionAfectada?: number;
    tipoEmergencia?: string;
    observaciones?: string;
    items: Array<{
      tipo: 'KIT' | 'PRODUCTO';
      kitId?: string;
      productoId?: string;
      cantidad: number;
    }>;
  },
): Promise<Demanda> {
  return request<Demanda>(`${org(orgId)}/demandas`, { method: 'POST', body: JSON.stringify(body) });
}

export function cancelarDemanda(request: Peticion, orgId: string, id: string): Promise<Demanda> {
  return request<Demanda>(`${org(orgId)}/demandas/${id}/cancelar`, { method: 'POST' });
}

export function simularReserva(
  request: Peticion,
  orgId: string,
  demandaId: string,
  itemId: string,
): Promise<SimulacionReserva> {
  return request<SimulacionReserva>(
    `${org(orgId)}/demandas/${demandaId}/items/${itemId}/simulacion`,
  );
}

export function crearReserva(
  request: Peticion,
  orgId: string,
  demandaId: string,
  body: { demandaItemId: string; cantidad?: number; firme?: boolean; observaciones?: string },
): Promise<Reserva> {
  return request<Reserva>(`${org(orgId)}/demandas/${demandaId}/reservas`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function planEscaso(
  request: Peticion,
  orgId: string,
  acopioId: string,
): Promise<PlanEscaso> {
  return request<PlanEscaso>(`${org(orgId)}/demandas/plan-escaso?acopioId=${acopioId}`);
}

export function listarReservas(
  request: Peticion,
  orgId: string,
  acopioId: string,
): Promise<Reserva[]> {
  return request<Reserva[]>(`${org(orgId)}/acopios/${acopioId}/reservas`);
}

export function confirmarReserva(request: Peticion, orgId: string, id: string): Promise<Reserva> {
  return request<Reserva>(`${org(orgId)}/reservas/${id}/confirmar`, { method: 'POST' });
}

export function liberarReserva(request: Peticion, orgId: string, id: string): Promise<Reserva> {
  return request<Reserva>(`${org(orgId)}/reservas/${id}/liberar`, { method: 'POST' });
}
