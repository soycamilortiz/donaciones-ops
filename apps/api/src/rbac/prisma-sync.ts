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
} from '@prisma/client';
import type { AcopioFlujo, OrganizationTipo } from '@soschoco/shared';

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const ACOPIO_FLUJO_EN_SYNC: Exact<AcopioFlujo, PrismaAcopioFlujo> = true;

export const ORGANIZATION_TIPO_EN_SYNC: Exact<OrganizationTipo, PrismaOrganizationTipo> = true;
