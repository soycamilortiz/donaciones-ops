import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionDto, RoleDto } from './dto/rbac.dto';
import { RbacService } from './rbac.service';

@ApiTags('roles')
@ApiBearerAuth('jwt')
@Controller({ version: '1' })
export class RolesController {
  constructor(private readonly rbac: RbacService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Catálogo de roles y su matriz de permisos' })
  @ApiOkResponse({ type: [RoleDto] })
  async listRoles(): Promise<RoleDto[]> {
    const roles = await this.rbac.listRoles();
    return roles.map((role) => ({
      id: role.id,
      slug: role.slug,
      nombre: role.nombre,
      descripcion: role.descripcion,
      isActive: role.isActive,
      permissions: role.rolePermissions.map((item) => ({
        slug: item.permission.slug,
        nombre: item.permission.nombre,
        descripcion: item.permission.descripcion,
      })),
    }));
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Catálogo de permisos' })
  @ApiOkResponse({ type: [PermissionDto] })
  async listPermissions(): Promise<PermissionDto[]> {
    const permissions = await this.rbac.listPermissions();
    return permissions.map((item) => ({
      slug: item.slug,
      nombre: item.nombre,
      descripcion: item.descripcion,
    }));
  }
}
