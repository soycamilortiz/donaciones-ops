export const APP_NAME = 'SOS Chocó' as const;

export const ROUTES = {
  home: '/',
  app: '/app',
  recepciones: '/app/recepciones',
  nuevaRecepcion: '/app/recepciones/nueva',
  recepcionDetalle: (id: string) => `/app/recepciones/${id}`,
  recepcionFoto: (id: string) => `/app/recepciones/${id}/foto`,
  inventario: '/app/inventario',
  inventarioUbicaciones: '/app/ubicaciones',
  inventarioUbicar: '/app/inventario/ubicar',
  inventarioMover: '/app/inventario/mover',
  inventarioMoverDe: (acopioId: string, itemId?: string) =>
    itemId
      ? `/app/inventario/mover?acopio=${acopioId}&item=${itemId}`
      : `/app/inventario/mover?acopio=${acopioId}`,
  ubicaciones: '/app/ubicaciones',
  ubicacionesDe: (acopioId: string) => `/app/ubicaciones?acopio=${acopioId}`,
  kits: '/app/kits',
  demandas: '/app/demandas',
  demandaDetalle: (id: string) => `/app/demandas/${id}`,
  demandaControl: (id: string) => `/app/demandas/${id}/control`,
  demandaPicking: (id: string, kitId?: string) =>
    kitId ? `/app/demandas/${id}/picking?kit=${kitId}` : `/app/demandas/${id}/picking`,
  demandaConsolidacion: (id: string) => `/app/demandas/${id}/consolidacion`,
  demandaPalletizacion: (id: string) => `/app/demandas/${id}/palletizacion`,
  demandaPalletArmado: (demandaId: string, palletId: string) =>
    `/app/demandas/${demandaId}/palletizacion/${palletId}`,
  demandaCarga: (demandaId: string, planId?: string) =>
    planId ? `/app/demandas/${demandaId}/carga?plan=${planId}` : `/app/demandas/${demandaId}/carga`,
  despachos: '/app/despachos',
  transporte: '/app/transporte',
  transporteDetalle: (viajeId: string) => `/app/transporte/${viajeId}`,
  rutas: '/app/rutas',
  entregas: '/app/entregas',
  entregaDetalle: (viajeId: string) => `/app/entregas/${viajeId}`,
  signIn: '/sign-in',
  signUp: '/sign-up',
  verificarCorreo: '/verificar-correo',
  completarGoogle: '/completar-cuenta-google',
} as const;

export type RouteKey = keyof typeof ROUTES;
