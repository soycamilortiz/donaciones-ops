import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthUser } from '../auth/auth.types';
import { PermissionSlug } from '../rbac/catalog';
import {
  AddMemberDto,
  MemberDto,
  OrganizationDto,
  UpdateMemberDto,
  UpdateOrganizationDto,
  CreateOrganizationDto,
} from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Organizaciones del usuario' })
  @ApiOkResponse({ type: [OrganizationDto] })
  list(@CurrentUser() user: AuthUser) {
    return this.organizations.listForUser(user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear organización y quedar como administrador de acopio' })
  @ApiCreatedResponse({ type: OrganizationDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(user, dto);
  }

  @Get(':orgId')
  @RequirePermission(PermissionSlug.OrgRead)
  @ApiOperation({ summary: 'Detalle de una organización' })
  @ApiOkResponse({ type: OrganizationDto })
  get(
    @CurrentUser() user: AuthUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ) {
    return this.organizations.getForUser(user, orgId);
  }

  @Patch(':orgId')
  @RequirePermission(PermissionSlug.OrgUpdate)
  @ApiOperation({ summary: 'Actualizar caracterización' })
  @ApiOkResponse({ type: OrganizationDto })
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizations.update(orgId, dto);
  }

  @Get(':orgId/members')
  @RequirePermission(PermissionSlug.MembersRead)
  @ApiOperation({ summary: 'Miembros de la organización' })
  @ApiOkResponse({ type: [MemberDto] })
  async members(@Param('orgId', ParseUUIDPipe) orgId: string) {
    const rows = await this.organizations.listMembers(orgId);
    return rows.map((row) => this.toMember(row));
  }

  @Post(':orgId/members')
  @RequirePermission(PermissionSlug.MembersInvite)
  @ApiOperation({
    summary: 'Agregar miembro por correo (debe estar registrado)',
  })
  @ApiCreatedResponse({ type: MemberDto })
  @ApiConflictResponse({
    description: 'El correo no está registrado o ya es miembro',
  })
  async addMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: AddMemberDto,
  ) {
    const row = await this.organizations.addMember(orgId, {
      ...dto,
      correo: dto.correo.toLowerCase(),
    });
    return this.toMember(row);
  }

  @Patch(':orgId/members/:userId')
  @RequirePermission(PermissionSlug.MembersRole)
  @ApiOperation({ summary: 'Cambiar rol de un miembro' })
  @ApiOkResponse({ type: MemberDto })
  async updateMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const row = await this.organizations.updateMember(orgId, userId, dto);
    return this.toMember(row);
  }

  @Delete(':orgId/members/:userId')
  @HttpCode(204)
  @RequirePermission(PermissionSlug.MembersRemove)
  @ApiOperation({ summary: 'Dar de baja un miembro (no borra la membresía)' })
  async removeMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.organizations.removeMember(orgId, userId);
  }

  private toMember(row: {
    id: string;
    isPrimary: boolean;
    isActive: boolean;
    user: { id: string; usuario: string; nombre: string; correo: string };
    role: { slug: string; nombre: string };
  }): MemberDto {
    return {
      membershipId: row.id,
      userId: row.user.id,
      usuario: row.user.usuario,
      nombre: row.user.nombre,
      correo: row.user.correo,
      isPrimary: row.isPrimary,
      isActive: row.isActive,
      roleSlug: row.role.slug,
      roleNombre: row.role.nombre,
    };
  }
}
