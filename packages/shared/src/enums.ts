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

export const INVENTORY_CATEGORIAS = [
  { value: 'ALIMENTOS_NO_PERECEDEROS', label: 'Alimentos no perecederos' },
  { value: 'AGUA', label: 'Agua' },
  { value: 'ASEO_HIGIENE', label: 'Aseo e higiene' },
  { value: 'PANALES_BEBE', label: 'Pañales y elementos de bebé' },
  { value: 'MEDICAMENTOS', label: 'Medicamentos y primeros auxilios' },
  { value: 'ROPA_CALZADO', label: 'Prendas de vestir y calzado' },
  { value: 'COLCHONETAS_COBIJAS', label: 'Colchonetas, cobijas y abrigo' },
  { value: 'ALIMENTO_MASCOTAS', label: 'Alimento para mascotas' },
  { value: 'MEDICAMENTO_MASCOTAS', label: 'Medicamento para mascotas' },
  { value: 'LOGISTICA_RESCATE', label: 'Logística, emergencia y rescate' },
  { value: 'MENAJE_COCINA', label: 'Menaje y utensilios de cocina' },
  { value: 'DESECHABLES', label: 'Desechables' },
  { value: 'OTRO', label: 'Otro' },
] as const;

export const INVENTORY_UNIDADES = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'LIBRA', label: 'Libra' },
  { value: 'KILO', label: 'Kilo' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'BOTELLA', label: 'Botella' },
  { value: 'LATA', label: 'Lata' },
  { value: 'PAQUETE', label: 'Paquete' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'GALON', label: 'Galón' },
  { value: 'FRASCO', label: 'Frasco' },
  { value: 'TABLETA', label: 'Tableta' },
  { value: 'DOCENA', label: 'Docena' },
  { value: 'OTRO', label: 'Otra unidad' },
] as const;

export const INVENTORY_ESTADOS = [
  { value: 'NUEVO', label: 'Nuevo' },
  { value: 'BUEN_ESTADO', label: 'Buen estado' },
  { value: 'USADO', label: 'Usado' },
  { value: 'PROXIMO_A_VENCER', label: 'Próximo a vencer' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'NO_APLICA', label: 'No aplica' },
] as const;

export const INVENTORY_DESTINATARIOS = [
  { value: 'NO_APLICA', label: 'No aplica' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'MUJER', label: 'Mujer' },
  { value: 'HOMBRE', label: 'Hombre' },
  { value: 'NINO', label: 'Niño' },
  { value: 'NINA', label: 'Niña' },
  { value: 'BEBE', label: 'Bebé' },
  { value: 'MASCOTA', label: 'Mascota' },
] as const;

export const RecepcionTipo = {
  DonacionIndividual: 'DONACION_INDIVIDUAL',
  DonacionMasiva: 'DONACION_MASIVA',
  Transferencia: 'TRANSFERENCIA',
  Compra: 'COMPRA',
  Devolucion: 'DEVOLUCION',
  Reubicacion: 'REUBICACION',
  Otro: 'OTRO',
} as const;

export type RecepcionTipo = (typeof RecepcionTipo)[keyof typeof RecepcionTipo];

export const RecepcionPresentacion = {
  Suelta: 'SUELTA',
  Cajas: 'CAJAS',
  Bultos: 'BULTOS',
  Pallets: 'PALLETS',
  Contenedores: 'CONTENEDORES',
  Mixta: 'MIXTA',
} as const;

export type RecepcionPresentacion =
  (typeof RecepcionPresentacion)[keyof typeof RecepcionPresentacion];

export const RecepcionEstado = {
  Borrador: 'BORRADOR',
  EnRecepcion: 'EN_RECEPCION',
  EnInspeccion: 'EN_INSPECCION',
  PendienteValidacion: 'PENDIENTE_VALIDACION',
  Validada: 'VALIDADA',
  Cerrada: 'CERRADA',
  Anulada: 'ANULADA',
} as const;

export type RecepcionEstado = (typeof RecepcionEstado)[keyof typeof RecepcionEstado];

export const UnidadLogisticaTipo = {
  Pallet: 'PALLET',
  Caja: 'CAJA',
  Bulto: 'BULTO',
  Saco: 'SACO',
  Contenedor: 'CONTENEDOR',
  Caneca: 'CANECA',
  Bolsa: 'BOLSA',
  Paquete: 'PAQUETE',
  Otro: 'OTRO',
} as const;

export type UnidadLogisticaTipo = (typeof UnidadLogisticaTipo)[keyof typeof UnidadLogisticaTipo];

export const UnidadLogisticaEstado = {
  Recibida: 'RECIBIDA',
  Abierta: 'ABIERTA',
  Vacia: 'VACIA',
} as const;

export type UnidadLogisticaEstado =
  (typeof UnidadLogisticaEstado)[keyof typeof UnidadLogisticaEstado];

export const RecepcionItemEstado = {
  PendienteId: 'PENDIENTE_ID',
  Identificada: 'IDENTIFICADA',
  Inspeccionada: 'INSPECCIONADA',
  Validada: 'VALIDADA',
} as const;

export type RecepcionItemEstado = (typeof RecepcionItemEstado)[keyof typeof RecepcionItemEstado];

export const RECEPCION_TIPOS: ReadonlyArray<{ value: RecepcionTipo; label: string }> = [
  { value: RecepcionTipo.DonacionIndividual, label: 'Donación individual' },
  { value: RecepcionTipo.DonacionMasiva, label: 'Donación masiva' },
  { value: RecepcionTipo.Transferencia, label: 'Transferencia' },
  { value: RecepcionTipo.Compra, label: 'Compra' },
  { value: RecepcionTipo.Devolucion, label: 'Devolución' },
  { value: RecepcionTipo.Reubicacion, label: 'Reubicación' },
  { value: RecepcionTipo.Otro, label: 'Otro' },
];

export const RECEPCION_PRESENTACIONES: ReadonlyArray<{
  value: RecepcionPresentacion;
  label: string;
}> = [
  { value: RecepcionPresentacion.Suelta, label: 'Suelta' },
  { value: RecepcionPresentacion.Cajas, label: 'Cajas' },
  { value: RecepcionPresentacion.Bultos, label: 'Bultos' },
  { value: RecepcionPresentacion.Pallets, label: 'Pallets' },
  { value: RecepcionPresentacion.Contenedores, label: 'Contenedores' },
  { value: RecepcionPresentacion.Mixta, label: 'Mixta' },
];

export const UNIDAD_LOGISTICA_TIPOS: ReadonlyArray<{
  value: UnidadLogisticaTipo;
  label: string;
}> = [
  { value: UnidadLogisticaTipo.Pallet, label: 'Pallet' },
  { value: UnidadLogisticaTipo.Caja, label: 'Caja' },
  { value: UnidadLogisticaTipo.Bulto, label: 'Bulto' },
  { value: UnidadLogisticaTipo.Saco, label: 'Saco' },
  { value: UnidadLogisticaTipo.Contenedor, label: 'Contenedor' },
  { value: UnidadLogisticaTipo.Caneca, label: 'Caneca' },
  { value: UnidadLogisticaTipo.Bolsa, label: 'Bolsa' },
  { value: UnidadLogisticaTipo.Paquete, label: 'Paquete' },
  { value: UnidadLogisticaTipo.Otro, label: 'Otro' },
];
