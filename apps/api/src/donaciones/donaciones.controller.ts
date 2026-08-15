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
import {
  DonacionImagenEstado,
  MAX_IMAGEN_BYTES,
  PermissionSlug,
  TIPOS_IMAGEN_ACEPTADOS,
} from '@soschoco/shared';
import type { HandleUploadBody } from '@vercel/blob/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import { DonacionesService } from './donaciones.service';
import {
  CorregirProductoDto,
  DonacionImagenDto,
  NuevaRutaDto,
  PaginaDonacionImagenDto,
  ProductoDto,
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
    summary: 'Reservar la ruta para una foto nueva',
    description:
      'Devuelve el pathname que la PWA debe pasarle a upload(). El API la genera para que nadie escriba fuera del prefijo de su organización.',
  })
  @ApiCreatedResponse({ type: RutaSubidaDto })
  reservarRuta(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: NuevaRutaDto,
  ): RutaSubidaDto {
    return {
      pathname: this.donaciones.rutaParaSubida(orgId, dto.nombreArchivo),
      tiposAceptados: TIPOS_IMAGEN_ACEPTADOS,
      maxBytes: MAX_IMAGEN_BYTES,
    };
  }

  @Post('subidas')
  @RequirePermission(PermissionSlug.DonacionesWrite)
  @ApiOperation({
    summary: 'Emitir el token de subida (protocolo handleUpload de Vercel Blob)',
    description:
      'Lo llama el SDK del navegador, no la aplicación directamente. La imagen no pasa por el API.',
  })
  @ApiServiceUnavailableResponse({ description: 'Falta configurar BLOB_READ_WRITE_TOKEN' })
  autorizarSubida(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() body: HandleUploadBody) {
    return this.donaciones.autorizarSubida(orgId, body);
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
