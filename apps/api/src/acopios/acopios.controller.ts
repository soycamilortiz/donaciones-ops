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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../auth/require-permission.decorator';
import { PermissionSlug } from '../rbac/catalog';
import { AcopiosService } from './acopios.service';
import { AcopioDto, CreateAcopioDto, UpdateAcopioDto } from './dto/acopio.dto';

@ApiTags('acopios')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId/acopios', version: '1' })
export class AcopiosController {
  constructor(private readonly acopios: AcopiosService) {}

  @Get()
  @RequirePermission(PermissionSlug.AcopiosRead)
  @ApiOperation({ summary: 'Listar centros de acopio' })
  @ApiOkResponse({ type: [AcopioDto] })
  list(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.acopios.list(orgId);
  }

  @Post()
  @RequirePermission(PermissionSlug.AcopiosWrite)
  @ApiOperation({ summary: 'Crear centro de acopio' })
  @ApiCreatedResponse({ type: AcopioDto })
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateAcopioDto,
  ) {
    return this.acopios.create(orgId, dto);
  }

  @Patch(':acopioId')
  @RequirePermission(PermissionSlug.AcopiosWrite)
  @ApiOperation({ summary: 'Actualizar centro de acopio' })
  @ApiOkResponse({ type: AcopioDto })
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Body() dto: UpdateAcopioDto,
  ) {
    return this.acopios.update(orgId, acopioId, dto);
  }

  @Delete(':acopioId')
  @HttpCode(204)
  @RequirePermission(PermissionSlug.AcopiosWrite)
  @ApiOperation({ summary: 'Eliminar centro de acopio' })
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
  ) {
    return this.acopios.remove(orgId, acopioId);
  }
}
