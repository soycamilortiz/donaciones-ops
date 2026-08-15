/**
 * Enums del dominio. Deben coincidir con los `enum` de
 * `apps/api/prisma/schema.prisma`; la API valida esa correspondencia en
 * tiempo de compilación (ver `apps/api/src/rbac/prisma-sync.ts`).
 */

export const AcopioFlujo = {
  Recibir: 'RECIBIR',
  Enviar: 'ENVIAR',
  Ambos: 'AMBOS',
} as const;

export type AcopioFlujo = (typeof AcopioFlujo)[keyof typeof AcopioFlujo];

export const ORGANIZATION_TIPO = {
  CentroAcopio: 'CENTRO_ACOPIO',
  Rescate: 'RESCATE',
  OllaComunitaria: 'OLLA_COMUNITARIA',
  Institucion: 'INSTITUCION',
  Otro: 'OTRO',
} as const;

export type OrganizationTipo = (typeof ORGANIZATION_TIPO)[keyof typeof ORGANIZATION_TIPO];

export const DonacionImagenEstado = {
  Pendiente: 'PENDIENTE',
  Procesando: 'PROCESANDO',
  Procesada: 'PROCESADA',
  Fallida: 'FALLIDA',
} as const;

export type DonacionImagenEstado = (typeof DonacionImagenEstado)[keyof typeof DonacionImagenEstado];

/** Opciones con etiqueta para los selects del front. */
export const ACOPIO_FLUJOS: ReadonlyArray<{ value: AcopioFlujo; label: string }> = [
  { value: AcopioFlujo.Recibir, label: 'Recibir donaciones' },
  { value: AcopioFlujo.Enviar, label: 'Enviar donaciones' },
  { value: AcopioFlujo.Ambos, label: 'Recibir y enviar' },
];

export const ORGANIZATION_TIPOS: ReadonlyArray<{ value: OrganizationTipo; label: string }> = [
  { value: ORGANIZATION_TIPO.CentroAcopio, label: 'Centro de acopio' },
  { value: ORGANIZATION_TIPO.Rescate, label: 'Rescate' },
  { value: ORGANIZATION_TIPO.OllaComunitaria, label: 'Olla comunitaria' },
  { value: ORGANIZATION_TIPO.Institucion, label: 'Institución' },
  { value: ORGANIZATION_TIPO.Otro, label: 'Otro' },
];
