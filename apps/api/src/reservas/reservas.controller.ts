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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionSlug } from '@soschoco/shared';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import {
  CrearDemandaDto,
  CrearKitDto,
  CrearReservaDto,
  DemandaDto,
  KitComponenteInputDto,
  KitDto,
  PlanEscasoDto,
  ReservaDto,
  SimulacionReservaDto,
  UpdateKitDto,
} from './dto/reserva.dto';
import { ReservasService } from './reservas.service';

@ApiTags('reservas')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId', version: '1' })
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}

  @Get('catalogo/productos')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Catálogo para armar el BOM de un kit' })
  listCatalogoProductos() {
    return this.reservas.listCatalogoProductos();
  }

  @Get('kits')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [KitDto] })
  listKits(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.reservas.listKits(orgId);
  }

  @Post('kits')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: KitDto })
  createKit(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: CrearKitDto) {
    return this.reservas.createKit(orgId, dto);
  }

  @Patch('kits/:kitId')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOkResponse({ type: KitDto })
  updateKit(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('kitId', ParseUUIDPipe) kitId: string,
    @Body() dto: UpdateKitDto,
  ) {
    return this.reservas.updateKit(orgId, kitId, dto);
  }

  @Post('kits/:kitId/componentes')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOkResponse({ type: KitDto })
  addComponente(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('kitId', ParseUUIDPipe) kitId: string,
    @Body() dto: KitComponenteInputDto,
  ) {
    return this.reservas.addComponente(orgId, kitId, dto.productoId, dto.cantidad);
  }

  @Delete('kits/:kitId/componentes/:componenteId')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOkResponse({ type: KitDto })
  removeComponente(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('kitId', ParseUUIDPipe) kitId: string,
    @Param('componenteId', ParseUUIDPipe) componenteId: string,
  ) {
    return this.reservas.removeComponente(orgId, kitId, componenteId);
  }

  @Delete('kits/:kitId')
  @HttpCode(204)
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiNoContentResponse()
  removeKit(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('kitId', ParseUUIDPipe) kitId: string,
  ) {
    return this.reservas.removeKit(orgId, kitId);
  }

  @Get('demandas')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [DemandaDto] })
  listDemandas(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.reservas.listDemandas(orgId);
  }

  @Get('demandas/plan-escaso')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Cómo partir stock escaso entre demandas abiertas (prioridad + fecha)' })
  @ApiOkResponse({ type: PlanEscasoDto })
  planEscaso(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('acopioId', ParseUUIDPipe) acopioId: string,
  ) {
    return this.reservas.planEscaso(orgId, acopioId);
  }

  @Get('demandas/:demandaId')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: DemandaDto })
  getDemanda(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.reservas.getDemanda(orgId, demandaId);
  }

  @Post('demandas')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: DemandaDto })
  createDemanda(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: CrearDemandaDto,
  ) {
    return this.reservas.createDemanda(orgId, usuario.id, dto);
  }

  @Post('demandas/:demandaId/cancelar')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Cancela la demanda y libera todas las reservas' })
  @ApiOkResponse({ type: DemandaDto })
  cancelar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.reservas.cancelarDemanda(orgId, demandaId);
  }

  @Get('demandas/:demandaId/items/:itemId/simulacion')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Cuántos kits/unidades se pueden cubrir ahora, con plan FEFO' })
  @ApiOkResponse({ type: SimulacionReservaDto })
  simular(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.reservas.simularItem(orgId, demandaId, itemId);
  }

  @Post('demandas/:demandaId/reservas')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: ReservaDto })
  crearReserva(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('demandaId', ParseUUIDPipe) demandaId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: CrearReservaDto,
  ) {
    return this.reservas.crearReserva(orgId, usuario.id, demandaId, dto);
  }

  @Get('acopios/:acopioId/reservas')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [ReservaDto] })
  listReservas(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
  ) {
    return this.reservas.listReservas(orgId, acopioId);
  }

  @Get('reservas/:reservaId')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: ReservaDto })
  getReserva(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('reservaId', ParseUUIDPipe) reservaId: string,
  ) {
    return this.reservas.getReserva(orgId, reservaId);
  }

  @Post('reservas/:reservaId/confirmar')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Pasa PRE_RESERVA a RESERVADA y bloquea el stock' })
  @ApiOkResponse({ type: ReservaDto })
  confirmar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('reservaId', ParseUUIDPipe) reservaId: string,
  ) {
    return this.reservas.confirmarReserva(orgId, reservaId);
  }

  @Post('reservas/:reservaId/liberar')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Devuelve el compromiso a disponible. No mueve stock físico.' })
  @ApiOkResponse({ type: ReservaDto })
  liberar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('reservaId', ParseUUIDPipe) reservaId: string,
  ) {
    return this.reservas.liberarReserva(orgId, reservaId);
  }
}
