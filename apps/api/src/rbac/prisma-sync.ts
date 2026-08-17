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
  OrganizationTipo as PrismaOrganizationTipo,
  PutawayEstado as PrismaPutawayEstado,
  RecepcionEstado as PrismaRecepcionEstado,
  RecepcionPresentacion as PrismaRecepcionPresentacion,
  RecepcionTipo as PrismaRecepcionTipo,
  UbicacionEstado as PrismaUbicacionEstado,
  UbicacionFuncion as PrismaUbicacionFuncion,
  UbicacionTipo as PrismaUbicacionTipo,
} from '@prisma/client';
import type {
  AcopioFlujo,
  OrganizationTipo,
  PutawayEstado,
  RecepcionEstado,
  RecepcionPresentacion,
  RecepcionTipo,
  UbicacionEstado,
  UbicacionFuncion,
  UbicacionTipo,
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
