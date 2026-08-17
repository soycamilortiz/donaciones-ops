export const APP_NAME = 'SOS Chocó' as const;

export const ROUTES = {
  home: '/',
  app: '/app',
  donaciones: '/app/donaciones',
  nuevaDonacion: '/app/donaciones/nueva',
  revisionDonaciones: '/app/donaciones/revision',
  signIn: '/sign-in',
  signUp: '/sign-up',
  verificarCorreo: '/verificar-correo',
  completarGoogle: '/completar-cuenta-google',
} as const;

export type RouteKey = keyof typeof ROUTES;
