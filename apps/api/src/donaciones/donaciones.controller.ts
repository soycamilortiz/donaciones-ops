import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DonacionImagenEstado, PermissionSlug } from '@soschoco/shared';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import { DonacionesService } from './donaciones.service';
import {
  AutorizarSubidaDto,
  CorregirProductoDto,
  DonacionImagenDto,
  ProductoDto,
  RegistrarImagenDto,
  SubidaAutorizadaDto,
} from './dto/donacion.dto';

@ApiTags('donaciones')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId/donaciones', version: '1' })
export class DonacionesController {
  constructor(private readonly donaciones: DonacionesService) {}

  @Post('subidas')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({
    summary: 'Autorizar la subida de una foto',
    description:
      'Devuelve un token para que la PWA suba el archivo directo a Vercel Blob. La imagen no pasa por el API.',
  })
  @ApiCreatedResponse({ type: SubidaAutorizadaDto })
  @ApiServiceUnavailableResponse({ description: 'Falta configurar BLOB_READ_WRITE_TOKEN' })
  autorizarSubida(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: AutorizarSubidaDto) {
    return this.donaciones.autorizarSubida(orgId, dto);
  }

  @Post()
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({
    summary: 'Registrar una foto ya subida y encolar su reconocimiento',
  })
  @ApiCreatedResponse({ type: DonacionImagenDto })
  registrar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: RegistrarImagenDto,
  ) {
    return this.donaciones.registrarImagen(orgId, usuario.id, dto);
  }

  @Get()
  @RequirePermission(PermissionSlug.DonacionesRead)
  @ApiOperation({ summary: 'Listar fotos de productos donados' })
  @ApiQuery({ name: 'estado', required: false, enum: Object.values(DonacionImagenEstado) })
  @ApiOkResponse({ type: [DonacionImagenDto] })
  listar(@Param('orgId', ParseUUIDPipe) orgId: string, @Query('estado') estado?: string) {
    return this.donaciones.listar(orgId, estado);
  }

  @Get('productos')
  @RequirePermission(PermissionSlug.DonacionesRead)
  @ApiOperation({ summary: 'Catálogo de productos contra el que se reconoce' })
  @ApiOkResponse({ type: [ProductoDto] })
  listarProductos() {
    return this.donaciones.listarProductos();
  }

  @Get(':id')
  @RequirePermission(PermissionSlug.DonacionesRead)
  @ApiOperation({ summary: 'Ver una foto y su reconocimiento' })
  @ApiOkResponse({ type: DonacionImagenDto })
  obtener(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.donaciones.obtener(orgId, id);
  }

  @Patch(':id/producto')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Corregir a mano el producto reconocido' })
  @ApiOkResponse({ type: DonacionImagenDto })
  corregir(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CorregirProductoDto,
  ) {
    return this.donaciones.corregirProducto(orgId, id, dto.productoId);
  }

  @Post(':id/reprocesar')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Volver a encolar una imagen fallida' })
  @ApiOkResponse({ type: DonacionImagenDto })
  reprocesar(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.donaciones.reprocesar(orgId, id);
  }
}
