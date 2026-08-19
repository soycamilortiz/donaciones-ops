/**
 * Los enums viven duplicados por necesidad: Prisma los genera desde
 * `schema.prisma` (y el front no puede depender de `@prisma/client`), así que
 * `@soschoco/shared` mantiene su propia copia.
 *
 * Este archivo no se ejecuta: existe para que `tsc` falle si alguna de las dos
 * definiciones cambia sin la otra. Si ves un error aquí, sincroniza
 * `packages/shared/src/enums.ts` con `apps/api/prisma/schema.prisma`.
 */

import type {
  AcopioFlujo as PrismaAcopioFlujo,
  CargaEstado as PrismaCargaEstado,
  CargaItemTipo as PrismaCargaItemTipo,
  ConsolidacionEstado as PrismaConsolidacionEstado,
  ControlLoteEstado as PrismaControlLoteEstado,
  ControlModo as PrismaControlModo,
  ControlResultado as PrismaControlResultado,
  DemandaEstado as PrismaDemandaEstado,
  DemandaItemTipo as PrismaDemandaItemTipo,
  DemandaPrioridad as PrismaDemandaPrioridad,
  DespachoEstado as PrismaDespachoEstado,
  InventoryMovimientoTipo as PrismaInventoryMovimientoTipo,
  KitInstanciaEstado as PrismaKitInstanciaEstado,
  OrganizationTipo as PrismaOrganizationTipo,
  PalletDespachoEstado as PrismaPalletDespachoEstado,
  PalletDespachoItemTipo as PrismaPalletDespachoItemTipo,
  PlanPalletizacionEstado as PrismaPlanPalletizacionEstado,
  PutawayEstado as PrismaPutawayEstado,
  RecepcionEstado as PrismaRecepcionEstado,
  RecepcionPresentacion as PrismaRecepcionPresentacion,
  RecepcionTipo as PrismaRecepcionTipo,
  ReservaEstado as PrismaReservaEstado,
  UbicacionEstado as PrismaUbicacionEstado,
  UbicacionFuncion as PrismaUbicacionFuncion,
  UbicacionTipo as PrismaUbicacionTipo,
  ViajeEstado as PrismaViajeEstado,
} from '@prisma/client';
import type {
  AcopioFlujo,
  CargaEstado,
  CargaItemTipo,
  ConsolidacionEstado,
  ControlLoteEstado,
  ControlModo,
  ControlResultado,
  DemandaEstado,
  DemandaItemTipo,
  DemandaPrioridad,
  DespachoEstado,
  InventoryMovimientoTipo,
  KitInstanciaEstado,
  OrganizationTipo,
  PalletDespachoEstado,
  PalletDespachoItemTipo,
  PlanPalletizacionEstado,
  PutawayEstado,
  RecepcionEstado,
  RecepcionPresentacion,
  RecepcionTipo,
  ReservaEstado,
  UbicacionEstado,
  UbicacionFuncion,
  UbicacionTipo,
  ViajeEstado,
} from '@soschoco/shared';

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const ACOPIO_FLUJO_EN_SYNC: Exact<AcopioFlujo, PrismaAcopioFlujo> = true;

export const ORGANIZATION_TIPO_EN_SYNC: Exact<OrganizationTipo, PrismaOrganizationTipo> = true;

export const RECEPCION_TIPO_EN_SYNC: Exact<RecepcionTipo, PrismaRecepcionTipo> = true;

export const RECEPCION_PRESENTACION_EN_SYNC: Exact<
  RecepcionPresentacion,
  PrismaRecepcionPresentacion
> = true;

export const RECEPCION_ESTADO_EN_SYNC: Exact<RecepcionEstado, PrismaRecepcionEstado> = true;

export const UBICACION_TIPO_EN_SYNC: Exact<UbicacionTipo, PrismaUbicacionTipo> = true;

export const UBICACION_FUNCION_EN_SYNC: Exact<UbicacionFuncion, PrismaUbicacionFuncion> = true;

export const UBICACION_ESTADO_EN_SYNC: Exact<UbicacionEstado, PrismaUbicacionEstado> = true;

export const PUTAWAY_ESTADO_EN_SYNC: Exact<PutawayEstado, PrismaPutawayEstado> = true;

export const INVENTORY_MOVIMIENTO_TIPO_EN_SYNC: Exact<
  InventoryMovimientoTipo,
  PrismaInventoryMovimientoTipo
> = true;

export const DEMANDA_PRIORIDAD_EN_SYNC: Exact<DemandaPrioridad, PrismaDemandaPrioridad> = true;

export const DEMANDA_ESTADO_EN_SYNC: Exact<DemandaEstado, PrismaDemandaEstado> = true;

export const DEMANDA_ITEM_TIPO_EN_SYNC: Exact<DemandaItemTipo, PrismaDemandaItemTipo> = true;

export const RESERVA_ESTADO_EN_SYNC: Exact<ReservaEstado, PrismaReservaEstado> = true;

export const KIT_INSTANCIA_ESTADO_EN_SYNC: Exact<KitInstanciaEstado, PrismaKitInstanciaEstado> =
  true;

export const CONTROL_MODO_EN_SYNC: Exact<ControlModo, PrismaControlModo> = true;

export const CONTROL_LOTE_ESTADO_EN_SYNC: Exact<ControlLoteEstado, PrismaControlLoteEstado> = true;

export const CONTROL_RESULTADO_EN_SYNC: Exact<ControlResultado, PrismaControlResultado> = true;

export const CONSOLIDACION_ESTADO_EN_SYNC: Exact<ConsolidacionEstado, PrismaConsolidacionEstado> =
  true;

export const PLAN_PALLETIZACION_ESTADO_EN_SYNC: Exact<
  PlanPalletizacionEstado,
  PrismaPlanPalletizacionEstado
> = true;

export const PALLET_DESPACHO_ESTADO_EN_SYNC: Exact<
  PalletDespachoEstado,
  PrismaPalletDespachoEstado
> = true;

export const DESPACHO_ESTADO_EN_SYNC: Exact<DespachoEstado, PrismaDespachoEstado> = true;

export const VIAJE_ESTADO_EN_SYNC: Exact<ViajeEstado, PrismaViajeEstado> = true;

export const CARGA_ESTADO_EN_SYNC: Exact<CargaEstado, PrismaCargaEstado> = true;

export const CARGA_ITEM_TIPO_EN_SYNC: Exact<CargaItemTipo, PrismaCargaItemTipo> = true;

export const PALLET_DESPACHO_ITEM_TIPO_EN_SYNC: Exact<
  PalletDespachoItemTipo,
  PrismaPalletDespachoItemTipo
> = true;
