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
  ConfirmarPutawayDto,
  CrearPutawayDto,
  CreateUbicacionDto,
  PutawayDto,
  UbicacionDto,
  UpdateUbicacionDto,
} from './dto/ubicacion.dto';
import { UbicacionesService } from './ubicaciones.service';

@ApiTags('ubicaciones')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId/acopios/:acopioId', version: '1' })
export class UbicacionesController {
  constructor(private readonly ubicaciones: UbicacionesService) {}

  @Get('ubicaciones')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Ubicaciones físicas del acopio' })
  @ApiOkResponse({ type: [UbicacionDto] })
  list(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
  ) {
    return this.ubicaciones.list(orgId, acopioId);
  }

  @Post('ubicaciones')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Crear una zona, pasillo o posición' })
  @ApiCreatedResponse({ type: UbicacionDto })
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Body() dto: CreateUbicacionDto,
  ) {
    return this.ubicaciones.create(orgId, acopioId, dto);
  }

  @Patch('ubicaciones/:ubicacionId')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Editar una ubicación' })
  @ApiOkResponse({ type: UbicacionDto })
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Param('ubicacionId', ParseUUIDPipe) ubicacionId: string,
    @Body() dto: UpdateUbicacionDto,
  ) {
    return this.ubicaciones.update(orgId, acopioId, ubicacionId, dto);
  }

  @Delete('ubicaciones/:ubicacionId')
  @HttpCode(204)
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Dar de baja una ubicación (isActive=false)' })
  @ApiNoContentResponse()
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Param('ubicacionId', ParseUUIDPipe) ubicacionId: string,
  ) {
    return this.ubicaciones.remove(orgId, acopioId, ubicacionId);
  }

  @Get('putaway/pendientes')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Inventario aprobado que sigue en el muelle' })
  listPendientes(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
  ) {
    return this.ubicaciones.listPendientes(orgId, acopioId);
  }

  @Get('putaway/sugerencias/:itemId')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Ubicaciones compatibles y plan sugerido' })
  sugerir(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Query('cantidad') cantidad?: string,
  ) {
    const n = cantidad ? Number(cantidad) : undefined;
    return this.ubicaciones.sugerir(orgId, acopioId, itemId, Number.isFinite(n) ? n : undefined);
  }

  @Post('putaway/:itemId')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Armar la tarea de putaway; todavía no mueve stock' })
  @ApiCreatedResponse({ type: PutawayDto })
  crearPutaway(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: CrearPutawayDto,
  ) {
    return this.ubicaciones.crearPutaway(orgId, acopioId, itemId, usuario.id, dto);
  }

  @Get('putaway/tareas/:putawayId')
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOkResponse({ type: PutawayDto })
  getPutaway(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Param('putawayId', ParseUUIDPipe) putawayId: string,
  ) {
    return this.ubicaciones.getPutaway(orgId, acopioId, putawayId);
  }

  @Post('putaway/tareas/:putawayId/confirmar')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({
    summary: 'Confirmar putaway: hay que escribir el código de la ubicación destino',
  })
  @ApiOkResponse({ type: PutawayDto })
  confirmar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Param('putawayId', ParseUUIDPipe) putawayId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: ConfirmarPutawayDto,
  ) {
    return this.ubicaciones.confirmarPutaway(orgId, acopioId, putawayId, usuario.id, dto);
  }
}
