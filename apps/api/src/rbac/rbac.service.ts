import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PERMISSION_CATALOG, PermissionSlug, ROLE_CATALOG, RoleSlug } from '@soschoco/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoleDto, UpdatePermissionDto, UpdateRoleDto } from './dto/rbac.dto';

const roleInclude = {
  rolePermissions: { include: { permission: true } },
} as const;

@Injectable()
export class RbacService implements OnModuleInit {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCatalog();
  }

  async ensureCatalog(): Promise<void> {
    for (const permission of PERMISSION_CATALOG) {
      await this.prisma.permission.upsert({
        where: { slug: permission.slug },
        update: {},
        create: permission,
      });
    }

    const existingRoles = await this.prisma.role.findMany();
    const existingBySlug = new Map(existingRoles.map((role) => [role.slug, role]));

    for (const role of ROLE_CATALOG) {
      if (existingBySlug.has(role.slug)) {
        continue;
      }
      const created = await this.prisma.role.create({
        data: {
          slug: role.slug,
          nombre: role.nombre,
          descripcion: role.descripcion,
        },
      });
      existingBySlug.set(role.slug, created);
      const permissions = await this.prisma.permission.findMany({
        where: { slug: { in: [...role.permissions] } },
      });
      if (permissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: created.id,
            permissionId: permission.id,
          })),
        });
      }
    }

    const admin = existingBySlug.get(RoleSlug.AdministradorAcopio);
    if (admin) {
      const write = await this.prisma.permission.findUnique({
        where: { slug: PermissionSlug.RolesWrite },
      });
      if (write) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: admin.id,
              permissionId: write.id,
            },
          },
          update: {},
          create: { roleId: admin.id, permissionId: write.id },
        });
      }
    }

    this.logger.log('Catálogo de roles y permisos asegurado');
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: roleInclude,
    });
    const order = new Map<string, number>(ROLE_CATALOG.map((role, index) => [role.slug, index]));
    return roles.sort((a, b) => {
      const left = order.get(a.slug) ?? 1000;
      const right = order.get(b.slug) ?? 1000;
      if (left !== right) {
        return left - right;
      }
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { slug: 'asc' },
    });
  }

  async createRole(dto: CreateRoleDto) {
    const slug = dto.slug?.trim() || this.slugify(dto.nombre);
    if (!slug) {
      throw new ConflictException('No se pudo generar un slug para el rol');
    }
    const taken = await this.prisma.role.findUnique({ where: { slug } });
    if (taken) {
      throw new ConflictException(`Ya existe un rol con slug ${slug}`);
    }
    return this.prisma.role.create({
      data: {
        slug,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
      },
      include: roleInclude,
    });
  }

  async updateRole(roleId: string, dto: UpdateRoleDto) {
    await this.requireRole(roleId);
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(dto.nombre ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion.trim() || null } : {}),
      },
      include: roleInclude,
    });
  }

  async setRolePermissions(roleId: string, permissionSlugs: string[]) {
    const role = await this.requireRole(roleId);
    const unique = [...new Set(permissionSlugs)];
    const permissions = await this.prisma.permission.findMany({
      where: { slug: { in: unique } },
    });
    if (permissions.length !== unique.length) {
      throw new NotFoundException('Hay permisos que no existen en el catálogo');
    }

    const next = new Set(unique);
    if (role.slug === RoleSlug.AdministradorAcopio && !next.has(PermissionSlug.RolesWrite)) {
      throw new ForbiddenException(
        'El administrador de acopio debe conservar el permiso de editar roles',
      );
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId,
          permissionId: permission.id,
        })),
      }),
    ]);

    return this.requireRole(roleId);
  }

  async deleteRole(roleId: string) {
    const role = await this.requireRole(roleId);
    if (role.slug === RoleSlug.AdministradorAcopio) {
      throw new ForbiddenException('No se puede eliminar el rol administrador de acopio');
    }
    const members = await this.prisma.membership.count({
      where: { roleId },
    });
    if (members > 0) {
      throw new ConflictException('Hay personas con este rol. Reasignalas antes de eliminarlo');
    }
    await this.prisma.role.delete({ where: { id: roleId } });
  }

  async updatePermission(slug: string, dto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findUnique({
      where: { slug },
    });
    if (!permission) {
      throw new NotFoundException(`Permiso no existe: ${slug}`);
    }
    return this.prisma.permission.update({
      where: { slug },
      data: {
        ...(dto.nombre ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion.trim() || null } : {}),
      },
    });
  }

  private async requireRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: roleInclude,
    });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 64);
  }
}
