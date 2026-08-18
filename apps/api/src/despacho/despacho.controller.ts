import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { PermissionSlug } from '@soschoco/shared';

import type { AuthUser } from '../auth/auth.types';

import { CurrentUser } from '../auth/current-user.decorator';

import { RequirePermission } from '../auth/require-permission.decorator';

import { DespachoService } from './despacho.service';

import {
  ActualizarChecklistDto,
  CargarPalletDto,
  CrearDespachoDto,
  CrearViajeDto,
  DespachoDto,
  EscanearKitDto,
  FinalizarPalletDto,
  PalletDespachoDto,
  PlanPalletizacionDto,
  RetirarKitDto,
} from './dto/despacho.dto';

@ApiTags('palletizacion-despacho')

@ApiBearerAuth('jwt')

@Controller({ path: 'organizations/:orgId', version: '1' })
export class DespachoController {
  constructor(private readonly despacho: DespachoService) {}

  @Post('consolidaciones/:consolidacionId/planes-palletizacion')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Crea plan de palletización y pallets PAL-DSP desde una consolidación' })

  @ApiCreatedResponse({ type: PlanPalletizacionDto })
  crearPlan(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('consolidacionId', ParseUUIDPipe) consolidacionId: string,

    @CurrentUser() usuario: AuthUser,
  ) {
    return this.despacho.crearPlanDesdeConsolidacion(orgId, usuario.id, consolidacionId);
  }

  @Get('demandas/:demandaId/planes-palletizacion')

  @RequirePermission(PermissionSlug.InventoryRead)

  @ApiOkResponse({ type: [PlanPalletizacionDto] })
  listPlanes(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.despacho.listPlanesPorDemanda(orgId, demandaId);
  }

  @Get('planes-palletizacion/:id')

  @RequirePermission(PermissionSlug.InventoryRead)

  @ApiOkResponse({ type: PlanPalletizacionDto })
  getPlan(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.despacho.getPlan(orgId, id);
  }

  @Get('planes-palletizacion/:planId/pallets')

  @RequirePermission(PermissionSlug.InventoryRead)

  @ApiOkResponse({ type: [PalletDespachoDto] })
  listPalletsPlan(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.despacho.listPalletsPlan(orgId, planId);
  }

  @Get('pallets-despacho/:id')

  @RequirePermission(PermissionSlug.InventoryRead)

  @ApiOkResponse({ type: PalletDespachoDto })
  getPallet(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.despacho.getPallet(orgId, id);
  }

  @Get('pallets-despacho/by-codigo/:codigo')

  @RequirePermission(PermissionSlug.InventoryRead)

  @ApiOperation({ summary: 'Lookup por código o QR (PAL-DSP-…)' })

  @ApiOkResponse({ type: PalletDespachoDto })
  getPalletByCodigo(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('codigo') codigo: string,
  ) {
    return this.despacho.getPalletByCodigo(orgId, codigo);
  }

  @Post('pallets-despacho/:id/iniciar')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOkResponse({ type: PalletDespachoDto })
  iniciarPallet(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.despacho.iniciarPallet(orgId, id);
  }

  @Post('pallets-despacho/:id/escaneos')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Escanea un kit KIN-… sobre el pallet' })

  @ApiOkResponse({ type: PalletDespachoDto })
  escanearKit(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @CurrentUser() usuario: AuthUser,

    @Body() dto: EscanearKitDto,
  ) {
    return this.despacho.escanearKit(orgId, usuario.id, id, dto);
  }

  @Post('pallets-despacho/:id/retiros')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOkResponse({ type: PalletDespachoDto })
  retirarKit(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @Body() dto: RetirarKitDto,
  ) {
    return this.despacho.retirarKit(orgId, id, dto);
  }

  @Post('pallets-despacho/:id/finalizar')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOkResponse({ type: PalletDespachoDto })
  finalizarPallet(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @Body() dto: FinalizarPalletDto,
  ) {
    return this.despacho.finalizarPallet(orgId, id, dto);
  }

  @Post('pallets-despacho/:id/marcar-listo')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOkResponse({ type: PalletDespachoDto })
  marcarListo(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.despacho.marcarPalletListo(orgId, id);
  }

  @Post('planes-palletizacion/:planId/despachos')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiCreatedResponse({ type: DespachoDto })
  crearDespacho(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('planId', ParseUUIDPipe) planId: string,

    @CurrentUser() usuario: AuthUser,

    @Body() dto: CrearDespachoDto,
  ) {
    return this.despacho.crearDespacho(orgId, usuario.id, planId, dto);
  }

  @Get('despachos')

  @RequirePermission(PermissionSlug.InventoryRead)

  @ApiOperation({ summary: 'Torre de control: despachos recientes de la organización' })

  @ApiOkResponse({ type: [DespachoDto] })
  listDespachosOrg(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.despacho.listDespachosOrg(orgId);
  }

  @Get('demandas/:demandaId/despachos')

  @RequirePermission(PermissionSlug.InventoryRead)

  @ApiOkResponse({ type: [DespachoDto] })
  listDespachos(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('demandaId', ParseUUIDPipe) demandaId: string,
  ) {
    return this.despacho.listDespachosDemanda(orgId, demandaId);
  }

  @Get('despachos/:id')

  @RequirePermission(PermissionSlug.InventoryRead)

  @ApiOkResponse({ type: DespachoDto })
  getDespacho(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.despacho.getDespacho(orgId, id);
  }

  @Post('despachos/:id/planificar')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Pasa de borrador a planificado' })

  @ApiOkResponse({ type: DespachoDto })
  planificar(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.despacho.planificarDespacho(orgId, id);
  }

  @Post('despachos/:id/viajes')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Asigna vehículo y crea viaje con carga' })

  @ApiCreatedResponse({ type: DespachoDto })
  crearViaje(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @CurrentUser() usuario: AuthUser,

    @Body() dto: CrearViajeDto,
  ) {
    return this.despacho.crearViaje(orgId, usuario.id, id, dto);
  }

  @Post('despachos/:id/iniciar-carga')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOkResponse({ type: DespachoDto })

  @ApiQuery({ name: 'viajeId', required: false })
  iniciarCarga(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @Query('viajeId') viajeId?: string,
  ) {
    return this.despacho.iniciarCarga(orgId, id, viajeId);
  }

  @Post('despachos/:id/cargar-pallet')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Escanea un pallet PAL-DSP-… al vehículo' })

  @ApiOkResponse({ type: DespachoDto })
  cargarPallet(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @CurrentUser() usuario: AuthUser,

    @Body() dto: CargarPalletDto,
  ) {
    return this.despacho.cargarPallet(orgId, usuario.id, id, dto);
  }

  @Post('despachos/:id/verificar-carga')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Cierra la carga y genera manifiesto' })

  @ApiOkResponse({ type: DespachoDto })

  @ApiQuery({ name: 'permitirParcial', required: false, type: Boolean })
  verificarCarga(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @Query('permitirParcial') permitirParcial?: string,
  ) {
    return this.despacho.verificarCarga(orgId, id, {
      permitirParcial: permitirParcial === 'true' || permitirParcial === '1',
    });
  }

  @Post('despachos/:id/completar-carga')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOkResponse({ type: DespachoDto })
  completarCarga(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.despacho.completarCarga(orgId, id);
  }

  @Post('despachos/:id/checklist')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Control de salida antes de confirmar' })

  @ApiOkResponse({ type: DespachoDto })
  actualizarChecklist(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @Body() dto: ActualizarChecklistDto,
  ) {
    return this.despacho.actualizarChecklist(orgId, id, dto);
  }

  @Post('despachos/:id/confirmar-salida')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Confirma salida del acopio y registra movimientos DESPACHO' })

  @ApiOkResponse({ type: DespachoDto })

  @ApiQuery({ name: 'permitirParcial', required: false, type: Boolean })
  confirmarSalida(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @CurrentUser() usuario: AuthUser,

    @Query('permitirParcial') permitirParcial?: string,
  ) {
    return this.despacho.confirmarSalida(orgId, usuario.id, id, {
      permitirParcial: permitirParcial === 'true' || permitirParcial === '1',
    });
  }

  @Post('despachos/:id/despachar')

  @RequirePermission(PermissionSlug.InventoryWrite)

  @ApiOperation({ summary: 'Alias de confirmar-salida (permite parcial)' })

  @ApiOkResponse({ type: DespachoDto })
  despachar(
    @Param('orgId', ParseUUIDPipe) orgId: string,

    @Param('id', ParseUUIDPipe) id: string,

    @CurrentUser() usuario: AuthUser,
  ) {
    return this.despacho.despachar(orgId, id, usuario.id);
  }
}
