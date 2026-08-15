import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleSlug } from '../rbac/catalog';
import type { AuthUser } from '../auth/auth.types';
import type {
  AddMemberDto,
  CreateOrganizationDto,
  UpdateMemberDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(user: AuthUser) {
    return this.prisma.organization.findMany({
      where: { memberships: { some: { userId: user.id } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async getForUser(user: AuthUser, orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, memberships: { some: { userId: user.id } } },
    });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }
    return org;
  }

  async create(user: AuthUser, dto: CreateOrganizationDto) {
    const adminAcopio = await this.prisma.role.findUnique({
      where: { slug: RoleSlug.AdministradorAcopio },
    });
    if (!adminAcopio) {
      throw new NotFoundException('Catálogo de roles no inicializado');
    }

    const hasPrimary = await this.prisma.membership.findFirst({
      where: { userId: user.id, isPrimary: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          nombre: dto.nombre,
          correo: dto.correo,
          tipo: dto.tipo,
          tipoDetalle: dto.tipoDetalle,
          telefono: dto.telefono,
          descripcion: dto.descripcion,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: adminAcopio.id,
          isPrimary: !hasPrimary,
        },
      });

      return organization;
    });
  }

  async update(orgId: string, dto: UpdateOrganizationDto) {
    await this.ensureOrg(orgId);
    return this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });
  }

  listMembers(orgId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(orgId: string, dto: AddMemberDto) {
    await this.ensureOrg(orgId);
    const user = await this.prisma.user.findUnique({
      where: { correo: dto.correo.toLowerCase() },
    });
    if (!user) {
      throw new ConflictException(
        'El usuario debe registrarse primero con ese correo',
      );
    }

    const existing = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId: user.id, organizationId: orgId },
      },
    });
    if (existing) {
      throw new ConflictException('Esa persona ya pertenece a la organización');
    }

    const role = await this.findRole(dto.roleSlug ?? RoleSlug.Voluntario);

    return this.prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        roleId: role.id,
        isPrimary: false,
      },
      include: { user: true, role: true },
    });
  }

  async updateMember(orgId: string, userId: string, dto: UpdateMemberDto) {
    const membership = await this.requireMembership(orgId, userId);
    const role = await this.findRole(dto.roleSlug);

    if (
      membership.role.slug === RoleSlug.AdministradorAcopio &&
      role.slug !== RoleSlug.AdministradorAcopio
    ) {
      await this.assertNotLastAdminAcopio(orgId);
    }

    return this.prisma.membership.update({
      where: { id: membership.id },
      data: { roleId: role.id },
      include: { user: true, role: true },
    });
  }

  async removeMember(orgId: string, userId: string) {
    const membership = await this.requireMembership(orgId, userId);
    if (membership.role.slug === RoleSlug.AdministradorAcopio) {
      await this.assertNotLastAdminAcopio(orgId);
    }
    await this.prisma.membership.delete({ where: { id: membership.id } });
  }

  private async ensureOrg(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }
    return org;
  }

  private async findRole(slug: string) {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) {
      throw new NotFoundException(`Rol no existe: ${slug}`);
    }
    return role;
  }

  private async requireMembership(orgId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
      include: { role: true, user: true },
    });
    if (!membership) {
      throw new NotFoundException('El usuario no pertenece a la organización');
    }
    return membership;
  }

  private async assertNotLastAdminAcopio(orgId: string) {
    const admins = await this.prisma.membership.count({
      where: {
        organizationId: orgId,
        role: { slug: RoleSlug.AdministradorAcopio },
      },
    });
    if (admins <= 1) {
      throw new ForbiddenException(
        'La organización debe conservar al menos un administrador de acopio',
      );
    }
  }
}
