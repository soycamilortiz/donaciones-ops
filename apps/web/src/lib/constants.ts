export const APP_NAME = 'SOS Chocó' as const;

export const ROUTES = {
  home: '/',
  app: '/app',
  donaciones: '/app/donaciones',
  nuevaDonacion: '/app/donaciones/nueva',
  signIn: '/sign-in',
  signUp: '/sign-up',
} as const;

export type RouteKey = keyof typeof ROUTES;
