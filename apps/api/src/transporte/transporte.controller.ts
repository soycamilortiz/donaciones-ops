import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
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
  AsignarPalletParadaDto,
  AutoAsignarResultDto,
  ConductorDto,
  CargaPalletDto,
  CrearConductorDto,
  CrearRutaDto,
  CrearTransportistaDto,
  CrearVehiculoDto,
  CrearViajeParadasDto,
  RegistrarTransportEventDto,
  RutaDto,
  TransportistaDto,
  VehiculoDto,
  ViajeDetalleDto,
  ViajeResumenTransporteDto,
} from './dto/transporte.dto';
import { TransporteService } from './transporte.service';

@ApiTags('transporte')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId', version: '1' })
export class TransporteController {
  constructor(private readonly transporte: TransporteService) {}

  @Get('transportistas')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [TransportistaDto] })
  listTransportistas(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.transporte.listTransportistas(orgId);
  }

  @Post('transportistas')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: TransportistaDto })
  crearTransportista(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CrearTransportistaDto,
  ) {
    return this.transporte.crearTransportista(orgId, dto);
  }

  @Get('vehiculos')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [VehiculoDto] })
  listVehiculos(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.transporte.listVehiculos(orgId);
  }

  @Post('vehiculos')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: VehiculoDto })
  crearVehiculo(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CrearVehiculoDto,
  ) {
    return this.transporte.crearVehiculo(orgId, dto);
  }

  @Get('conductores')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [ConductorDto] })
  listConductores(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.transporte.listConductores(orgId);
  }

  @Post('conductores')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: ConductorDto })
  crearConductor(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CrearConductorDto,
  ) {
    return this.transporte.crearConductor(orgId, dto);
  }

  @Get('rutas')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: [RutaDto] })
  listRutas(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.transporte.listRutas(orgId);
  }

  @Post('rutas')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiCreatedResponse({ type: RutaDto })
  crearRuta(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: CrearRutaDto,
  ) {
    return this.transporte.crearRuta(orgId, usuario.id, dto);
  }

  @Get('transporte/viajes')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Torre de control TMS' })
  @ApiOkResponse({ type: [ViajeResumenTransporteDto] })
  listViajes(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.transporte.listViajes(orgId);
  }

  @Get('transporte/viajes/:id')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: ViajeDetalleDto })
  getViaje(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transporte.getViaje(orgId, id);
  }

  @Post('transporte/viajes/:id/paradas')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Define paradas del viaje (manual o desde ruta)' })
  @ApiOkResponse({ type: ViajeDetalleDto })
  crearParadas(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrearViajeParadasDto,
  ) {
    return this.transporte.crearParadas(orgId, id, dto);
  }

  @Post('transporte/viajes/:id/eventos')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Registra evento de seguimiento (salida, parada, destino)' })
  @ApiOkResponse({ type: ViajeDetalleDto })
  registrarEvento(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: RegistrarTransportEventDto,
  ) {
    return this.transporte.registrarEvento(orgId, usuario.id, id, dto);
  }

  @Get('transporte/viajes/:id/carga-pallets')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Pallets en el viaje y parada asignada' })
  @ApiOkResponse({ type: [CargaPalletDto] })
  listCargaPallets(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transporte.listCargaPallets(orgId, id);
  }

  @Post('transporte/viajes/:id/auto-asignar-pallets')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Asigna pallets a paradas por destinoNombre' })
  @ApiOkResponse({ type: AutoAsignarResultDto })
  autoAsignarPallets(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transporte.autoAsignarPallets(orgId, id);
  }

  @Post('transporte/viajes/:id/paradas/:paradaId/asignar-pallet')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOkResponse({ type: ViajeDetalleDto })
  asignarPalletParada(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paradaId', ParseUUIDPipe) paradaId: string,
    @Body() dto: AsignarPalletParadaDto,
  ) {
    return this.transporte.asignarPalletParada(orgId, id, paradaId, dto);
  }

  @Delete('transporte/viajes/:id/pallets/:palletId/asignacion')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOkResponse({ type: ViajeDetalleDto })
  desasignarPallet(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('palletId', ParseUUIDPipe) palletId: string,
  ) {
    return this.transporte.desasignarPallet(orgId, id, palletId);
  }

  @Post('transporte/viajes/:id/paradas/:paradaId/llegada')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOkResponse({ type: ViajeDetalleDto })
  registrarLlegadaParada(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paradaId', ParseUUIDPipe) paradaId: string,
    @CurrentUser() usuario: AuthUser,
  ) {
    return this.transporte.registrarLlegadaParada(orgId, usuario.id, id, paradaId);
  }

  @Post('transporte/viajes/:id/paradas/:paradaId/salida')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOkResponse({ type: ViajeDetalleDto })
  registrarSalidaParada(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paradaId', ParseUUIDPipe) paradaId: string,
    @CurrentUser() usuario: AuthUser,
  ) {
    return this.transporte.registrarSalidaParada(orgId, usuario.id, id, paradaId);
  }
}
