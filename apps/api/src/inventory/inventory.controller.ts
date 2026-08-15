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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionSlug } from '@soschoco/shared';
import { RequirePermission } from '../auth/require-permission.decorator';
import {
  CreateInventoryItemDto,
  InventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth('jwt')
@Controller({
  path: 'organizations/:orgId/acopios/:acopioId/inventory',
  version: '1',
})
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermission(PermissionSlug.InventoryRead)
  @ApiOperation({ summary: 'Inventario de un centro de acopio' })
  @ApiOkResponse({ type: [InventoryItemDto] })
  list(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
  ) {
    return this.inventory.list(orgId, acopioId);
  }

  @Post()
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Cargar un producto al inventario' })
  @ApiCreatedResponse({ type: InventoryItemDto })
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventory.create(orgId, acopioId, dto);
  }

  @Patch(':itemId')
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Actualizar un ítem de inventario' })
  @ApiOkResponse({ type: InventoryItemDto })
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventory.update(orgId, acopioId, itemId, dto);
  }

  @Delete(':itemId')
  @HttpCode(204)
  @RequirePermission(PermissionSlug.InventoryWrite)
  @ApiOperation({ summary: 'Dar de baja un ítem (isActive=false, no borra)' })
  @ApiNoContentResponse()
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('acopioId', ParseUUIDPipe) acopioId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.inventory.remove(orgId, acopioId, itemId);
  }
}
