import { SetMetadata } from '@nestjs/common';
import type { PermissionSlug } from '@soschoco/shared';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: PermissionSlug) =>
  SetMetadata(PERMISSION_KEY, permission);
