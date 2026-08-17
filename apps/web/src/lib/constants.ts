export const APP_NAME = 'SOS Chocó' as const;

export const ROUTES = {
  home: '/',
  app: '/app',
  recepciones: '/app/recepciones',
  nuevaRecepcion: '/app/recepciones/nueva',
  recepcionDetalle: (id: string) => `/app/recepciones/${id}`,
  recepcionFoto: (id: string) => `/app/recepciones/${id}/foto`,
  signIn: '/sign-in',
  signUp: '/sign-up',
  verificarCorreo: '/verificar-correo',
  completarGoogle: '/completar-cuenta-google',
} as const;

export type RouteKey = keyof typeof ROUTES;
