export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

export type EntregaEstadoPod =
  | 'PENDIENTE'
  | 'PARCIAL'
  | 'COMPLETA'
  | 'CON_DIFERENCIAS'
  | 'RECHAZADA';

export type EntregaPendiente = {
  viajeId: string;
  viajeCodigo: string;
  despachoCodigo: string;
  destinoNombre?: string | null;
  kitsCargados: number;
  salidaReal?: string | null;
};

export type EntregaPallet = {
  id: string;
  codigo: string;
  destinoNombre: string;
  kitsEsperados: number;
  pesoBrutoKg?: number | null;
  despachoCodigo: string;
};

export type EntregaContexto = {
  viajeId: string;
  viajeCodigo: string;
  despachoCodigo: string;
  destinoNombre: string;
  kitsEsperados: number;
  palletsCount: number;
  pallets: EntregaPallet[];
  entregaEstado?: EntregaEstadoPod | null;
};

export type ProofOfDelivery = {
  id: string;
  estado: EntregaEstadoPod;
  cantidadEsperada?: number | null;
  cantidadRecibida?: number | null;
  cantidadDanada: number;
  cantidadFaltante: number;
  cantidadDevuelta: number;
  receivedBy?: string | null;
  entregadoAt?: string | null;
};

function org(orgId: string) {
  return `/api/v1/organizations/${orgId}`;
}

export async function listarEntregasPendientes(
  request: Peticion,
  orgId: string,
): Promise<EntregaPendiente[]> {
  return request<EntregaPendiente[]>(`${org(orgId)}/entregas/pendientes`);
}

export async function getContextoEntrega(
  request: Peticion,
  orgId: string,
  viajeId: string,
): Promise<EntregaContexto> {
  return request<EntregaContexto>(`${org(orgId)}/entregas/viajes/${viajeId}`);
}

export async function confirmarEntrega(
  request: Peticion,
  orgId: string,
  viajeId: string,
  body: {
    receivedBy: string;
    receiverDocument?: string;
    cantidadRecibida?: number;
    cantidadDanada?: number;
    cantidadFaltante?: number;
    cantidadDevuelta?: number;
    observaciones?: string;
  },
): Promise<ProofOfDelivery> {
  return request<ProofOfDelivery>(`${org(orgId)}/entregas/viajes/${viajeId}/confirmar`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
