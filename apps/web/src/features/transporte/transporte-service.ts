import type { ViajeEstado } from '@soschoco/shared';

export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

export type EntregaEstadoPod =
  | 'PENDIENTE'
  | 'PARCIAL'
  | 'COMPLETA'
  | 'CON_DIFERENCIAS'
  | 'RECHAZADA';

export type ViajeResumenTransporte = {
  id: string;
  codigo: string;
  estado: ViajeEstado;
  despachoCodigo: string;
  destinoNombre?: string | null;
  vehiculoPlaca?: string | null;
  palletsCargados: number;
  kitsCargados: number;
  salidaReal?: string | null;
  entregaEstado?: EntregaEstadoPod | null;
};

export type TransportEvent = {
  id: string;
  tipo: string;
  fechaHora: string;
  ubicacionNombre?: string | null;
  observaciones?: string | null;
};

export type ViajeParada = {
  id: string;
  sequence: number;
  nombre: string;
  destinoNombre?: string | null;
  estado: string;
  palletCodigos: string[];
  palletsCount: number;
  kitsCount: number;
};

export type CargaPallet = {
  id: string;
  codigo: string;
  destinoNombre: string;
  kitsCount: number;
  pesoBrutoKg?: number | null;
  paradaId?: string | null;
  paradaNombre?: string | null;
};

export type ViajeDetalle = ViajeResumenTransporte & {
  despachoId: string;
  origenNombre?: string | null;
  transportistaNombre?: string | null;
  conductorNombre?: string | null;
  palletsEsperados: number;
  kitsEsperados: number;
  pesoCargadoKg: number;
  salidaProgramada?: string | null;
  llegadaEstimada?: string | null;
  llegadaReal?: string | null;
  observaciones?: string | null;
  paradas: ViajeParada[];
  eventos: TransportEvent[];
  rutaId?: string | null;
  palletsSinAsignar: number;
};

function org(orgId: string) {
  return `/organizations/${orgId}`;
}

export async function listarViajes(
  request: Peticion,
  orgId: string,
): Promise<ViajeResumenTransporte[]> {
  return request<ViajeResumenTransporte[]>(`${org(orgId)}/transporte/viajes`);
}

export async function getViaje(
  request: Peticion,
  orgId: string,
  viajeId: string,
): Promise<ViajeDetalle> {
  return request<ViajeDetalle>(`${org(orgId)}/transporte/viajes/${viajeId}`);
}

export async function registrarEventoViaje(
  request: Peticion,
  orgId: string,
  viajeId: string,
  body: { tipo: string; ubicacionNombre?: string; observaciones?: string },
): Promise<ViajeDetalle> {
  return request<ViajeDetalle>(`${org(orgId)}/transporte/viajes/${viajeId}/eventos`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listarCargaPallets(
  request: Peticion,
  orgId: string,
  viajeId: string,
): Promise<CargaPallet[]> {
  return request<CargaPallet[]>(`${org(orgId)}/transporte/viajes/${viajeId}/carga-pallets`);
}

export async function crearParadasViaje(
  request: Peticion,
  orgId: string,
  viajeId: string,
  body: { rutaId?: string; paradas?: Array<{ sequence: number; nombre: string; destinoNombre?: string }> },
): Promise<ViajeDetalle> {
  return request<ViajeDetalle>(`${org(orgId)}/transporte/viajes/${viajeId}/paradas`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function autoAsignarPallets(
  request: Peticion,
  orgId: string,
  viajeId: string,
): Promise<{ asignados: number; sinAsignar: number }> {
  return request(`${org(orgId)}/transporte/viajes/${viajeId}/auto-asignar-pallets`, {
    method: 'POST',
  });
}

export async function asignarPalletParada(
  request: Peticion,
  orgId: string,
  viajeId: string,
  paradaId: string,
  codigoPallet: string,
): Promise<ViajeDetalle> {
  return request<ViajeDetalle>(
    `${org(orgId)}/transporte/viajes/${viajeId}/paradas/${paradaId}/asignar-pallet`,
    { method: 'POST', body: JSON.stringify({ codigoPallet }) },
  );
}

export async function registrarLlegadaParada(
  request: Peticion,
  orgId: string,
  viajeId: string,
  paradaId: string,
): Promise<ViajeDetalle> {
  return request<ViajeDetalle>(
    `${org(orgId)}/transporte/viajes/${viajeId}/paradas/${paradaId}/llegada`,
    { method: 'POST' },
  );
}

export async function registrarSalidaParada(
  request: Peticion,
  orgId: string,
  viajeId: string,
  paradaId: string,
): Promise<ViajeDetalle> {
  return request<ViajeDetalle>(
    `${org(orgId)}/transporte/viajes/${viajeId}/paradas/${paradaId}/salida`,
    { method: 'POST' },
  );
}
