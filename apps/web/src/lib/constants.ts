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
  signIn: '/sign-in',
  signUp: '/sign-up',
  verificarCorreo: '/verificar-correo',
  completarGoogle: '/completar-cuenta-google',
} as const;

export type RouteKey = keyof typeof ROUTES;
