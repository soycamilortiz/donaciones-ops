import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionSlug } from '@soschoco/shared';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import {
  CrearRecepcionItemDto,
  CreateRecepcionDto,
  GenerarUnidadesDto,
  InspeccionarItemDto,
  RecepcionDto,
} from './dto/recepcion.dto';
import { RecepcionesService } from './recepciones.service';

@ApiTags('recepciones')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId/recepciones', version: '1' })
export class RecepcionesController {
  constructor(private readonly recepciones: RecepcionesService) {}

  @Get()
  @RequirePermission(PermissionSlug.DonacionesRead)
  @ApiOperation({ summary: 'Listar recepciones de la organización' })
  @ApiOkResponse({ type: [RecepcionDto] })
  list(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.recepciones.list(orgId);
  }

  @Post()
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Abrir una recepción (camión, donación individual, etc.)' })
  @ApiCreatedResponse({ type: RecepcionDto })
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: CreateRecepcionDto,
  ) {
    return this.recepciones.create(orgId, usuario.id, dto);
  }

  @Get(':id')
  @RequirePermission(PermissionSlug.DonacionesRead)
  @ApiOperation({ summary: 'Ver una recepción con unidades y líneas' })
  @ApiOkResponse({ type: RecepcionDto })
  get(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.recepciones.get(orgId, id);
  }

  @Post(':id/unidades')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Generar N unidades logísticas (pallets, cajas…)' })
  @ApiOkResponse({ type: RecepcionDto })
  generarUnidades(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerarUnidadesDto,
  ) {
    return this.recepciones.generarUnidades(orgId, id, dto);
  }

  @Post(':id/items')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Agregar una línea a mano (sin foto)' })
  @ApiOkResponse({ type: RecepcionDto })
  agregarItem(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrearRecepcionItemDto,
  ) {
    return this.recepciones.agregarItem(orgId, id, dto);
  }

  @Post(':id/items/:itemId/inspeccion')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Partir cantidades: aprobada / cuarentena / rechazada' })
  @ApiOkResponse({ type: RecepcionDto })
  inspeccionar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: InspeccionarItemDto,
  ) {
    return this.recepciones.inspeccionarItem(orgId, id, itemId, dto);
  }

  @Post(':id/validar')
  @HttpCode(200)
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Validar y postear al inventario solo lo aprobado' })
  @ApiOkResponse({ type: RecepcionDto })
  validar(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.recepciones.validar(orgId, id);
  }

  @Post(':id/anular')
  @HttpCode(200)
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Anular una recepción que todavía no se validó' })
  @ApiOkResponse({ type: RecepcionDto })
  anular(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.recepciones.anular(orgId, id);
  }
}
