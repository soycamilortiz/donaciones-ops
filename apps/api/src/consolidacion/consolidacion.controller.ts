import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
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
import { ConsolidacionService } from './consolidacion.service';
import {
  ArmarKitsDto,
  ConfirmarPickLineaDto,
  ConsolidacionDto,
  ControlLoteDto,
  CrearConsolidacionDto,
  CrearControlDto,
  InspeccionarKitDto,
  KitInstanciaDto,
  PipelineDemandaDto,
} from './dto/consolidacion.dto';

@ApiTags('control-consolidacion')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId', version: '1' })
export class ConsolidacionController {
  constructor(private readonly consolidacion: ConsolidacionService) {}

  @Get('demandas/:demandaId/pipeline')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: PipelineDemandaDto })
  pipeline(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.consolidacion.pipeline(orgId, demandaId);
  }

  @Get('demandas/:demandaId/kits-armados')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [KitInstanciaDto] })
  listInstancias(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.consolidacion.listInstancias(orgId, demandaId);
  }

  @Get('kits-armados/:id')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: KitInstanciaDto })
  getInstancia(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.consolidacion.getInstancia(orgId, id);
  }

  @Post('kits-armados')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({
    summary:
      'Prepara kits para picking desde una reserva firme (composición FEFO con ubicación origen)',
  })
  @ApiCreatedResponse()
  armar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: ArmarKitsDto,
  ) {
    return this.consolidacion.armarDesdeReserva(orgId, usuario.id, dto.reservaId);
  }

  @Post('kits-armados/:id/pick-lineas/:itemId')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Confirma pick de una línea: mueve stock reservado a zona kitting' })
  @ApiOkResponse({ type: KitInstanciaDto })
  confirmarPickLinea(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: ConfirmarPickLineaDto,
  ) {
    return this.consolidacion.confirmarPickLinea(orgId, usuario.id, id, itemId, dto);
  }

  @Post('kits-armados/:id/confirmar-armado')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Confirma kit físicamente armado tras completar el picking' })
  @ApiOkResponse({ type: KitInstanciaDto })
  confirmarKitArmado(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.consolidacion.confirmarKitArmado(orgId, id);
  }

  @Get('demandas/:demandaId/controles')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [ControlLoteDto] })
  listControles(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.consolidacion.listControles(orgId, demandaId);
  }

  @Post('controles')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: ControlLoteDto })
  crearControl(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: CrearControlDto,
  ) {
    return this.consolidacion.crearControl(orgId, usuario.id, dto);
  }

  @Get('controles/:id')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: ControlLoteDto })
  getControl(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.consolidacion.getControl(orgId, id);
  }

  @Post('controles/:id/inspecciones/:inspeccionId')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOkResponse({ type: ControlLoteDto })
  inspeccionar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inspeccionId', ParseUUIDPipe) inspeccionId: string,
    @Body() dto: InspeccionarKitDto,
  ) {
    return this.consolidacion.inspeccionar(orgId, id, inspeccionId, dto);
  }

  @Post('controles/:id/expandir-total')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Pasa de muestreo a control 100% (si el umbral de defecto se superó)' })
  @ApiOkResponse({ type: ControlLoteDto })
  expandir(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.consolidacion.expandirATotal(orgId, id);
  }

  @Get('demandas/:demandaId/propuesta-pallets')
  @RequirePermission(PermissionSlug.InventoryRead)
  propuesta(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.consolidacion.proponerParaDemanda(orgId, demandaId);
  }

  @Get('demandas/:demandaId/consolidaciones')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [ConsolidacionDto] })
  listConsolidaciones(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.consolidacion.listConsolidaciones(orgId, demandaId);
  }

  @Post('demandas/:demandaId/consolidaciones')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: ConsolidacionDto })
  consolidar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: CrearConsolidacionDto,
  ) {
    return this.consolidacion.consolidar(orgId, usuario.id, demandaId, dto);
  }

  @Get('consolidaciones/:id')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: ConsolidacionDto })
  getConsolidacion(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.consolidacion.getConsolidacion(orgId, id);
  }
}
