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

export const UbicacionTipo = {
  Zona: 'ZONA',
  Pasillo: 'PASILLO',
  Rack: 'RACK',
  Nivel: 'NIVEL',
  Posicion: 'POSICION',
  Otro: 'OTRO',
} as const;

export type UbicacionTipo = (typeof UbicacionTipo)[keyof typeof UbicacionTipo];

export const UbicacionFuncion = {
  Recepcion: 'RECEPCION',
  Cuarentena: 'CUARENTENA',
  Almacenamiento: 'ALMACENAMIENTO',
  Picking: 'PICKING',
  Kitting: 'KITTING',
  Despacho: 'DESPACHO',
  Devolucion: 'DEVOLUCION',
  Rechazado: 'RECHAZADO',
} as const;

export type UbicacionFuncion = (typeof UbicacionFuncion)[keyof typeof UbicacionFuncion];

export const UbicacionEstado = {
  Activa: 'ACTIVA',
  Inactiva: 'INACTIVA',
  Bloqueada: 'BLOQUEADA',
  Mantenimiento: 'MANTENIMIENTO',
} as const;

export type UbicacionEstado = (typeof UbicacionEstado)[keyof typeof UbicacionEstado];

export const InventoryMovimientoTipo = {
  Recepcion: 'RECEPCION',
  Putaway: 'PUTAWAY',
  Reubicacion: 'REUBICACION',
  Picking: 'PICKING',
  Ajuste: 'AJUSTE',
  Despacho: 'DESPACHO',
} as const;

export type InventoryMovimientoTipo =
  (typeof InventoryMovimientoTipo)[keyof typeof InventoryMovimientoTipo];

export const INVENTORY_MOVIMIENTO_TIPOS: ReadonlyArray<{
  value: InventoryMovimientoTipo;
  label: string;
}> = [
  { value: InventoryMovimientoTipo.Recepcion, label: 'Recepción' },
  { value: InventoryMovimientoTipo.Putaway, label: 'Putaway' },
  { value: InventoryMovimientoTipo.Reubicacion, label: 'Reubicación' },
  { value: InventoryMovimientoTipo.Picking, label: 'Picking' },
  { value: InventoryMovimientoTipo.Ajuste, label: 'Ajuste' },
  { value: InventoryMovimientoTipo.Despacho, label: 'Despacho' },
];

export const PutawayEstado = {
  Pendiente: 'PENDIENTE',
  Completado: 'COMPLETADO',
  Anulado: 'ANULADO',
} as const;

export type PutawayEstado = (typeof PutawayEstado)[keyof typeof PutawayEstado];

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

export const UBICACION_TIPOS: ReadonlyArray<{ value: UbicacionTipo; label: string }> = [
  { value: UbicacionTipo.Zona, label: 'Zona' },
  { value: UbicacionTipo.Pasillo, label: 'Pasillo' },
  { value: UbicacionTipo.Rack, label: 'Rack' },
  { value: UbicacionTipo.Nivel, label: 'Nivel' },
  { value: UbicacionTipo.Posicion, label: 'Posición' },
  { value: UbicacionTipo.Otro, label: 'Otro' },
];

export const UBICACION_FUNCIONES: ReadonlyArray<{ value: UbicacionFuncion; label: string }> = [
  { value: UbicacionFuncion.Recepcion, label: 'Recepción / muelle' },
  { value: UbicacionFuncion.Cuarentena, label: 'Cuarentena' },
  { value: UbicacionFuncion.Almacenamiento, label: 'Almacenamiento' },
  { value: UbicacionFuncion.Picking, label: 'Picking' },
  { value: UbicacionFuncion.Kitting, label: 'Kitting' },
  { value: UbicacionFuncion.Despacho, label: 'Despacho' },
  { value: UbicacionFuncion.Devolucion, label: 'Devolución' },
  { value: UbicacionFuncion.Rechazado, label: 'Rechazado' },
];

export const UBICACION_ESTADOS: ReadonlyArray<{ value: UbicacionEstado; label: string }> = [
  { value: UbicacionEstado.Activa, label: 'Activa' },
  { value: UbicacionEstado.Inactiva, label: 'Inactiva' },
  { value: UbicacionEstado.Bloqueada, label: 'Bloqueada' },
  { value: UbicacionEstado.Mantenimiento, label: 'Mantenimiento' },
];

/** Destinos de un traslado entre zonas. El muelle no entra: eso es putaway. */
export const FUNCIONES_REUBICACION_DESTINO: readonly UbicacionFuncion[] = [
  UbicacionFuncion.Almacenamiento,
  UbicacionFuncion.Picking,
  UbicacionFuncion.Kitting,
  UbicacionFuncion.Cuarentena,
  UbicacionFuncion.Despacho,
  UbicacionFuncion.Devolucion,
  UbicacionFuncion.Rechazado,
];

export function origenAdmiteReubicacion(funcion: string): boolean {
  return funcion !== UbicacionFuncion.Recepcion;
}

export function destinoAdmiteReubicacion(funcion: string): boolean {
  return (FUNCIONES_REUBICACION_DESTINO as readonly string[]).includes(funcion);
}

const CATS_ALIMENTOS: ReadonlySet<string> = new Set([
  'ALIMENTOS_NO_PERECEDEROS',
  'AGUA',
  'ALIMENTO_MASCOTAS',
]);
const CATS_MEDICAMENTOS: ReadonlySet<string> = new Set(['MEDICAMENTOS', 'MEDICAMENTO_MASCOTAS']);
const CATS_ROPA: ReadonlySet<string> = new Set(['ROPA_CALZADO', 'COLCHONETAS_COBIJAS']);

export function categoriaCompatible(
  categoria: string,
  ubicacion: {
    permiteAlimentos: boolean;
    permiteMedicamentos: boolean;
    permiteRopa: boolean;
  },
): boolean {
  if (CATS_ALIMENTOS.has(categoria)) {
    return ubicacion.permiteAlimentos;
  }
  if (CATS_MEDICAMENTOS.has(categoria)) {
    return ubicacion.permiteMedicamentos;
  }
  if (CATS_ROPA.has(categoria)) {
    return ubicacion.permiteRopa;
  }
  return true;
}

export const DemandaPrioridad = {
  Critica: 'CRITICA',
  Alta: 'ALTA',
  Media: 'MEDIA',
  Baja: 'BAJA',
} as const;

export type DemandaPrioridad = (typeof DemandaPrioridad)[keyof typeof DemandaPrioridad];

export const DemandaEstado = {
  Abierta: 'ABIERTA',
  Parcial: 'PARCIAL',
  Cubierta: 'CUBIERTA',
  Cancelada: 'CANCELADA',
  Cerrada: 'CERRADA',
} as const;

export type DemandaEstado = (typeof DemandaEstado)[keyof typeof DemandaEstado];

export const DemandaItemTipo = {
  Kit: 'KIT',
  Producto: 'PRODUCTO',
} as const;

export type DemandaItemTipo = (typeof DemandaItemTipo)[keyof typeof DemandaItemTipo];

export const ReservaEstado = {
  PreReserva: 'PRE_RESERVA',
  Reservada: 'RESERVADA',
  Liberada: 'LIBERADA',
  Cancelada: 'CANCELADA',
  Consumida: 'CONSUMIDA',
} as const;

export type ReservaEstado = (typeof ReservaEstado)[keyof typeof ReservaEstado];

export const KitInstanciaEstado = {
  PendientePick: 'PENDIENTE_PICK',
  Armado: 'ARMADO',
  EnControl: 'EN_CONTROL',
  Aprobado: 'APROBADO',
  Observado: 'OBSERVADO',
  Rechazado: 'RECHAZADO',
  Consolidado: 'CONSOLIDADO',
  Palletizado: 'PALLETIZADO',
  Despachado: 'DESPACHADO',
} as const;

export type KitInstanciaEstado = (typeof KitInstanciaEstado)[keyof typeof KitInstanciaEstado];

export const ControlModo = {
  Total: 'TOTAL',
  Muestreo: 'MUESTREO',
} as const;

export type ControlModo = (typeof ControlModo)[keyof typeof ControlModo];

export const ControlLoteEstado = {
  Abierto: 'ABIERTO',
  RequiereTotal: 'REQUIERE_TOTAL',
  Cerrado: 'CERRADO',
} as const;

export type ControlLoteEstado = (typeof ControlLoteEstado)[keyof typeof ControlLoteEstado];

export const ControlResultado = {
  Pendiente: 'PENDIENTE',
  Aprobado: 'APROBADO',
  Observado: 'OBSERVADO',
  Rechazado: 'RECHAZADO',
} as const;

export type ControlResultado = (typeof ControlResultado)[keyof typeof ControlResultado];

export const ConsolidacionEstado = {
  Abierta: 'ABIERTA',
  Lista: 'LISTA',
  Cerrada: 'CERRADA',
} as const;

export type ConsolidacionEstado = (typeof ConsolidacionEstado)[keyof typeof ConsolidacionEstado];

export const PlanPalletizacionEstado = {
  Borrador: 'BORRADOR',
  Activo: 'ACTIVO',
  Cerrado: 'CERRADO',
  Cancelado: 'CANCELADO',
} as const;

export type PlanPalletizacionEstado =
  (typeof PlanPalletizacionEstado)[keyof typeof PlanPalletizacionEstado];

export const PalletDespachoEstado = {
  Creado: 'CREADO',
  EnConstruccion: 'EN_CONSTRUCCION',
  Completo: 'COMPLETO',
  ListoParaDespacho: 'LISTO_PARA_DESPACHO',
  Cargado: 'CARGADO',
  Despachado: 'DESPACHADO',
  Bloqueado: 'BLOQUEADO',
  Cancelado: 'CANCELADO',
} as const;

export type PalletDespachoEstado = (typeof PalletDespachoEstado)[keyof typeof PalletDespachoEstado];

export const DespachoEstado = {
  Borrador: 'BORRADOR',
  Planificado: 'PLANIFICADO',
  ListoParaCarga: 'LISTO_PARA_CARGA',
  Cargando: 'CARGANDO',
  Cargado: 'CARGADO',
  Despachado: 'DESPACHADO',
  EnTransito: 'EN_TRANSITO',
  Entregado: 'ENTREGADO',
  Parcial: 'PARCIAL',
  Cancelado: 'CANCELADO',
  Retenido: 'RETENIDO',
  Devuelto: 'DEVUELTO',
  EnCarga: 'EN_CARGA',
  Listo: 'LISTO',
  EnRuta: 'EN_RUTA',
  Anulado: 'ANULADO',
} as const;

export type DespachoEstado = (typeof DespachoEstado)[keyof typeof DespachoEstado];

export const ViajeEstado = {
  Planificado: 'PLANIFICADO',
  Cargando: 'CARGANDO',
  Cargado: 'CARGADO',
  Despachado: 'DESPACHADO',
  EnTransito: 'EN_TRANSITO',
  Entregado: 'ENTREGADO',
  Cancelado: 'CANCELADO',
} as const;

export type ViajeEstado = (typeof ViajeEstado)[keyof typeof ViajeEstado];

export const CargaEstado = {
  Abierta: 'ABIERTA',
  Cargando: 'CARGANDO',
  Completa: 'COMPLETA',
  Cerrada: 'CERRADA',
} as const;

export type CargaEstado = (typeof CargaEstado)[keyof typeof CargaEstado];

export const CargaItemTipo = {
  Pallet: 'PALLET',
  Caja: 'CAJA',
  Contenedor: 'CONTENEDOR',
  Producto: 'PRODUCTO',
} as const;

export type CargaItemTipo = (typeof CargaItemTipo)[keyof typeof CargaItemTipo];

export const PalletDespachoItemTipo = {
  Kit: 'KIT',
  Producto: 'PRODUCTO',
} as const;

export type PalletDespachoItemTipo =
  (typeof PalletDespachoItemTipo)[keyof typeof PalletDespachoItemTipo];

export const DEMANDA_PRIORIDADES: ReadonlyArray<{ value: DemandaPrioridad; label: string }> = [
  { value: DemandaPrioridad.Critica, label: 'Crítica' },
  { value: DemandaPrioridad.Alta, label: 'Alta' },
  { value: DemandaPrioridad.Media, label: 'Media' },
  { value: DemandaPrioridad.Baja, label: 'Baja' },
];
