import type {
  Despacho,
  DespachoChecklist,
  PalletDespacho,
  PlanPalletizacion,
} from '@soschoco/shared';

export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

const org = (orgId: string) => `/api/v1/organizations/${orgId}`;

export function listarPlanesPalletizacion(request: Peticion, orgId: string, demandaId: string) {
  return request<PlanPalletizacion[]>(`${org(orgId)}/demandas/${demandaId}/planes-palletizacion`);
}

export function crearPlanPalletizacion(
  request: Peticion,

  orgId: string,

  consolidacionId: string,
) {
  return request<PlanPalletizacion>(
    `${org(orgId)}/consolidaciones/${consolidacionId}/planes-palletizacion`,

    { method: 'POST' },
  );
}

export function getPlanPalletizacion(request: Peticion, orgId: string, planId: string) {
  return request<PlanPalletizacion>(`${org(orgId)}/planes-palletizacion/${planId}`);
}

export function listarPalletsPlan(request: Peticion, orgId: string, planId: string) {
  return request<PalletDespacho[]>(`${org(orgId)}/planes-palletizacion/${planId}/pallets`);
}

export function getPalletDespacho(request: Peticion, orgId: string, palletId: string) {
  return request<PalletDespacho>(`${org(orgId)}/pallets-despacho/${palletId}`);
}

export function iniciarPallet(request: Peticion, orgId: string, palletId: string) {
  return request<PalletDespacho>(`${org(orgId)}/pallets-despacho/${palletId}/iniciar`, {
    method: 'POST',
  });
}

export function escanearKitPallet(
  request: Peticion,

  orgId: string,

  palletId: string,

  codigoKit: string,
) {
  return request<PalletDespacho>(`${org(orgId)}/pallets-despacho/${palletId}/escaneos`, {
    method: 'POST',

    body: JSON.stringify({ codigoKit }),
  });
}

export function retirarKitPallet(
  request: Peticion,

  orgId: string,

  palletId: string,

  codigoKit: string,

  motivo: string,
) {
  return request<PalletDespacho>(`${org(orgId)}/pallets-despacho/${palletId}/retiros`, {
    method: 'POST',

    body: JSON.stringify({ codigoKit, motivo }),
  });
}

export function finalizarPallet(
  request: Peticion,

  orgId: string,

  palletId: string,

  body: {
    pesoBrutoKg: number;

    pesoPalletKg?: number;

    altoM: number;

    anchoM: number;

    largoM: number;
  },
) {
  return request<PalletDespacho>(`${org(orgId)}/pallets-despacho/${palletId}/finalizar`, {
    method: 'POST',

    body: JSON.stringify(body),
  });
}

export function marcarPalletListo(request: Peticion, orgId: string, palletId: string) {
  return request<PalletDespacho>(`${org(orgId)}/pallets-despacho/${palletId}/marcar-listo`, {
    method: 'POST',
  });
}

export function crearDespacho(
  request: Peticion,

  orgId: string,

  planId: string,

  body?: { observaciones?: string; salidaProgramada?: string },
) {
  return request<Despacho>(`${org(orgId)}/planes-palletizacion/${planId}/despachos`, {
    method: 'POST',

    body: JSON.stringify(body ?? {}),
  });
}

export function listarDespachosOrg(request: Peticion, orgId: string) {
  return request<Despacho[]>(`${org(orgId)}/despachos`);
}

export function listarDespachos(request: Peticion, orgId: string, demandaId: string) {
  return request<Despacho[]>(`${org(orgId)}/demandas/${demandaId}/despachos`);
}

export function getDespacho(request: Peticion, orgId: string, despachoId: string) {
  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}`);
}

export function planificarDespacho(request: Peticion, orgId: string, despachoId: string) {
  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/planificar`, { method: 'POST' });
}

export function crearViajeDespacho(
  request: Peticion,

  orgId: string,

  despachoId: string,

  body: {
    vehiculoPlaca?: string;

    vehiculoTipo?: string;

    vehiculoCapacidadKg?: number;

    transportista?: string;

    conductorNombre?: string;

    conductorDocumento?: string;

    palletsEsperados?: number;
  },
) {
  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/viajes`, {
    method: 'POST',

    body: JSON.stringify(body),
  });
}

export function iniciarCarga(
  request: Peticion,
  orgId: string,
  despachoId: string,
  viajeId?: string,
) {
  const qs = viajeId ? `?viajeId=${encodeURIComponent(viajeId)}` : '';

  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/iniciar-carga${qs}`, {
    method: 'POST',
  });
}

export function cargarPalletDespacho(
  request: Peticion,

  orgId: string,

  despachoId: string,

  codigoPallet: string,

  viajeId?: string,
) {
  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/cargar-pallet`, {
    method: 'POST',

    body: JSON.stringify({ codigoPallet, viajeId }),
  });
}

export function verificarCarga(
  request: Peticion,

  orgId: string,

  despachoId: string,

  permitirParcial = false,
) {
  const qs = permitirParcial ? '?permitirParcial=true' : '';

  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/verificar-carga${qs}`, {
    method: 'POST',
  });
}

export function completarCarga(request: Peticion, orgId: string, despachoId: string) {
  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/completar-carga`, {
    method: 'POST',
  });
}

export function actualizarChecklistDespacho(
  request: Peticion,

  orgId: string,

  despachoId: string,

  body: Partial<DespachoChecklist>,
) {
  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/checklist`, {
    method: 'POST',

    body: JSON.stringify(body),
  });
}

export function confirmarSalidaDespacho(
  request: Peticion,

  orgId: string,

  despachoId: string,

  permitirParcial = false,
) {
  const qs = permitirParcial ? '?permitirParcial=true' : '';

  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/confirmar-salida${qs}`, {
    method: 'POST',
  });
}

export function despacharSalida(request: Peticion, orgId: string, despachoId: string) {
  return request<Despacho>(`${org(orgId)}/despachos/${despachoId}/despachar`, {
    method: 'POST',
  });
}
