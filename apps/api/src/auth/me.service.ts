import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';
import type { MeResponseDto, UpdateMeDto } from './dto/me.dto';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: AuthUser): Promise<MeResponseDto> {
    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          where: {
            isActive: true,
            organization: { isActive: true },
            role: { isActive: true },
          },
          include: {
            organization: true,
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: record.id,
      usuario: record.usuario,
      nombre: record.nombre,
      correo: record.correo,
      memberships: record.memberships.map((membership) => ({
        id: membership.id,
        isPrimary: membership.isPrimary,
        role: {
          id: membership.role.id,
          slug: membership.role.slug,
          nombre: membership.role.nombre,
        },
        organization: {
          id: membership.organization.id,
          nombre: membership.organization.nombre,
          tipo: membership.organization.tipo,
        },
        permissions: membership.role.rolePermissions.map((item) => item.permission.slug),
      })),
    };
  }

  async updateMe(user: AuthUser, dto: UpdateMeDto): Promise<MeResponseDto> {
    if (dto.nombre) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { nombre: dto.nombre },
      });
    }
    return this.getMe({ ...user, nombre: dto.nombre ?? user.nombre });
  }
}
