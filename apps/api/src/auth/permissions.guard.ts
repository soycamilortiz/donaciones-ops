import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionSlug } from '@soschoco/shared';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';
import { PERMISSION_KEY } from './require-permission.decorator';

type AuthedRequest = Request & { user?: AuthUser };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<PermissionSlug | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const user = request.user;
    const orgIdRaw = request.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : orgIdRaw;

    if (!user || !orgId) {
      throw new ForbiddenException('Se requiere una organización activa');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No perteneces a esta organización');
    }

    const slugs = membership.role.rolePermissions.map((item) => item.permission.slug);
    if (!slugs.includes(permission)) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }

    return true;
  }
}
