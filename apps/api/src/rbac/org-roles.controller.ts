import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../auth/require-permission.decorator';
import { PermissionSlug } from './catalog';
import {
  CreateRoleDto,
  PermissionDto,
  RoleDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from './dto/rbac.dto';
import { RbacService } from './rbac.service';

@ApiTags('roles')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId', version: '1' })
export class OrgRolesController {
  constructor(private readonly rbac: RbacService) {}

  @Post('roles')
  @RequirePermission(PermissionSlug.RolesWrite)
  @ApiOperation({ summary: 'Crear un rol' })
  @ApiCreatedResponse({ type: RoleDto })
  @ApiConflictResponse({ description: 'Slug duplicado' })
  async create(@Param('orgId', ParseUUIDPipe) _orgId: string, @Body() dto: CreateRoleDto) {
    const role = await this.rbac.createRole(dto);
    return this.toRole(role);
  }

  @Patch('roles/:roleId')
  @RequirePermission(PermissionSlug.RolesWrite)
  @ApiOperation({ summary: 'Renombrar un rol' })
  @ApiOkResponse({ type: RoleDto })
  async update(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.toRole(await this.rbac.updateRole(roleId, dto));
  }

  @Put('roles/:roleId/permissions')
  @RequirePermission(PermissionSlug.RolesWrite)
  @ApiOperation({ summary: 'Reemplazar permisos de un rol' })
  @ApiOkResponse({ type: RoleDto })
  async setPermissions(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.toRole(await this.rbac.setRolePermissions(roleId, dto.permissionSlugs));
  }

  @Delete('roles/:roleId')
  @HttpCode(204)
  @RequirePermission(PermissionSlug.RolesWrite)
  @ApiOperation({ summary: 'Eliminar un rol sin personas asignadas' })
  @ApiNoContentResponse()
  async remove(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    await this.rbac.deleteRole(roleId);
  }

  @Patch('permissions/:slug')
  @RequirePermission(PermissionSlug.RolesWrite)
  @ApiOperation({ summary: 'Editar etiqueta de un permiso' })
  @ApiOkResponse({ type: PermissionDto })
  updatePermission(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.rbac.updatePermission(slug, dto);
  }

  private toRole(role: Awaited<ReturnType<RbacService['createRole']>>): RoleDto {
    return {
      id: role.id,
      slug: role.slug,
      nombre: role.nombre,
      descripcion: role.descripcion,
      permissions: role.rolePermissions.map((item) => ({
        slug: item.permission.slug,
        nombre: item.permission.nombre,
        descripcion: item.permission.descripcion,
      })),
    };
  }
}
