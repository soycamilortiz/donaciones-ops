import type { Consolidacion, ControlLote, KitInstancia, PipelineDemanda } from '@soschoco/shared';

export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

const org = (orgId: string) => `/api/v1/organizations/${orgId}`;

export function getPipeline(request: Peticion, orgId: string, demandaId: string) {
  return request<PipelineDemanda>(`${org(orgId)}/demandas/${demandaId}/pipeline`);
}

export function listarKitsArmados(request: Peticion, orgId: string, demandaId: string) {
  return request<KitInstancia[]>(`${org(orgId)}/demandas/${demandaId}/kits-armados`);
}

export function armarKits(request: Peticion, orgId: string, reservaId: string) {
  return request<{ creados: number }>(`${org(orgId)}/kits-armados`, {
    method: 'POST',
    body: JSON.stringify({ reservaId }),
  });
}

export function getKitArmado(request: Peticion, orgId: string, kitInstanciaId: string) {
  return request<KitInstancia>(`${org(orgId)}/kits-armados/${kitInstanciaId}`);
}

export function confirmarPickLinea(
  request: Peticion,
  orgId: string,
  kitInstanciaId: string,
  itemId: string,
  body: { codigoOrigen: string; codigoDestino: string },
) {
  return request<KitInstancia>(
    `${org(orgId)}/kits-armados/${kitInstanciaId}/pick-lineas/${itemId}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function confirmarKitArmado(request: Peticion, orgId: string, kitInstanciaId: string) {
  return request<KitInstancia>(`${org(orgId)}/kits-armados/${kitInstanciaId}/confirmar-armado`, {
    method: 'POST',
  });
}

export function listarControles(request: Peticion, orgId: string, demandaId: string) {
  return request<ControlLote[]>(`${org(orgId)}/demandas/${demandaId}/controles`);
}

export function crearControl(
  request: Peticion,
  orgId: string,
  body: { reservaId: string; modo?: string; porcentajeMuestra?: number; umbralDefecto?: number },
) {
  return request<ControlLote>(`${org(orgId)}/controles`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function inspeccionarKit(
  request: Peticion,
  orgId: string,
  controlId: string,
  inspeccionId: string,
  resultado: string,
  observaciones?: string,
) {
  return request<ControlLote>(`${org(orgId)}/controles/${controlId}/inspecciones/${inspeccionId}`, {
    method: 'POST',
    body: JSON.stringify({ resultado, observaciones }),
  });
}

export function expandirControlTotal(request: Peticion, orgId: string, controlId: string) {
  return request<ControlLote>(`${org(orgId)}/controles/${controlId}/expandir-total`, {
    method: 'POST',
  });
}

export function propuestaPallets(request: Peticion, orgId: string, demandaId: string) {
  return request<{
    kits: number;
    kitsPorPallet: number;
    pallets: number;
    pesoPalletKg: number;
    altoPalletM: number | null;
  }>(`${org(orgId)}/demandas/${demandaId}/propuesta-pallets`);
}

export function listarConsolidaciones(request: Peticion, orgId: string, demandaId: string) {
  return request<Consolidacion[]>(`${org(orgId)}/demandas/${demandaId}/consolidaciones`);
}

export function crearConsolidacion(request: Peticion, orgId: string, demandaId: string) {
  return request<Consolidacion>(`${org(orgId)}/demandas/${demandaId}/consolidaciones`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
