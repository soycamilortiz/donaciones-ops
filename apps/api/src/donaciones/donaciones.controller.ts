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
  ConfirmarDonacionDto,
  ConsultaEanDto,
  CorregirProductoDto,
  DonacionImagenDto,
  EntradaDonacionDto,
  InterpretacionDto,
  InterpretarImagenDto,
  NuevaRutaDto,
  PaginaDonacionImagenDto,
  ProductoDto,
  RegistrarEntradaDto,
  RegistrarImagenDto,
  RutaSubidaDto,
} from './dto/donacion.dto';

@ApiTags('donaciones')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId/donaciones', version: '1' })
export class DonacionesController {
  constructor(private readonly donaciones: DonacionesService) {}

  @Post('subidas/ruta')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({
    summary: 'Reservar clave en R2 y firmar el PUT',
    description:
      'Devuelve pathname, URL firmada (5 min) y URL pública. La PWA hace PUT directo al bucket.',
  })
  @ApiCreatedResponse({ type: RutaSubidaDto })
  @ApiServiceUnavailableResponse({
    description: 'Faltan R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT o R2_PUBLIC_BASE_URL',
  })
  reservarRuta(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: NuevaRutaDto) {
    return this.donaciones.reservarSubida(orgId, dto.nombreArchivo, dto.contentType);
  }

  @Post()
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({
    summary:
      'Registrar una foto ya subida. El reconocimiento (EAN o visión) lo pide la PWA después.',
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
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Id de la última fila de la página anterior',
  })
  @ApiQuery({ name: 'limite', required: false, description: 'Entre 1 y 200. Default 50' })
  @ApiOkResponse({ type: PaginaDonacionImagenDto })
  listar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('estado') estado?: string,
    @Query('cursor') cursor?: string,
    @Query('limite') limite?: string,
  ) {
    return this.donaciones.listar(orgId, {
      estado,
      cursor,
      limite: limite ? Number.parseInt(limite, 10) : undefined,
    });
  }

  @Get('productos')
  @RequirePermission(PermissionSlug.DonacionesRead)
  @ApiOperation({ summary: 'Catálogo de productos contra el que se reconoce' })
  @ApiOkResponse({ type: [ProductoDto] })
  listarProductos() {
    return this.donaciones.listarProductos();
  }

  @Get('ean/:codigo')
  @RequirePermission(PermissionSlug.DonacionesRead)
  @ApiOperation({
    summary: 'Resolver un EAN: catálogo local, luego Open Food Facts',
  })
  @ApiOkResponse({ type: ConsultaEanDto })
  consultarEan(@Param('codigo') codigo: string) {
    return this.donaciones.consultarEan(codigo);
  }

  @Post('entradas')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({
    summary: 'Registrar donación sin foto (manual o código de barras) y sumar inventario',
  })
  @ApiCreatedResponse({ type: EntradaDonacionDto })
  registrarEntrada(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: RegistrarEntradaDto) {
    return this.donaciones.registrarEntrada(orgId, dto);
  }

  @Get(':id')
  @RequirePermission(PermissionSlug.DonacionesRead)
  @ApiOperation({ summary: 'Ver una foto y su reconocimiento' })
  @ApiOkResponse({ type: DonacionImagenDto })
  obtener(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.donaciones.obtener(orgId, id);
  }

  @Post(':id/interpretar')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({
    summary: 'Resolver la foto: EAN (BD/OFF) o visión, más coincidencias de inventario',
  })
  @ApiOkResponse({ type: InterpretacionDto })
  interpretar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InterpretarImagenDto,
  ) {
    return this.donaciones.interpretarImagen(orgId, id, dto);
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

  @Post(':id/confirmar')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({
    summary: 'Confirmar el producto identificado y colgarlo de una recepción (no posta inventario)',
  })
  @ApiOkResponse({ type: DonacionImagenDto })
  confirmar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: ConfirmarDonacionDto,
  ) {
    return this.donaciones.confirmarDonacion(orgId, id, usuario.id, dto);
  }

  @Post(':id/reprocesar')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({ summary: 'Volver a encolar una imagen fallida' })
  @ApiOkResponse({ type: DonacionImagenDto })
  reprocesar(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.donaciones.reprocesar(orgId, id);
  }
}
