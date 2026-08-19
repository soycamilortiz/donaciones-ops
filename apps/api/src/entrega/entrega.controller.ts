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
import {
  ConfirmarEntregaDto,
  EntregaContextoDto,
  EntregaPalletDto,
  EntregaPendienteDto,
  ProofOfDeliveryDto,
} from './dto/entrega.dto';
import { EntregaService } from './entrega.service';

@ApiTags('entrega')
@ApiBearerAuth('jwt')
@Controller({ path: 'organizations/:orgId', version: '1' })
export class EntregaController {
  constructor(private readonly entrega: EntregaService) {}

  @Get('entregas/pendientes')
  @RequirePermission(PermissionSlug.EntregaRead)
  @ApiOperation({ summary: 'Viajes en tránsito pendientes de POD' })
  @ApiOkResponse({ type: [EntregaPendienteDto] })
  listPendientes(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.entrega.listPendientes(orgId);
  }

  @Get('entregas/viajes/:viajeId')
  @RequirePermission(PermissionSlug.EntregaRead)
  @ApiOkResponse({ type: EntregaContextoDto })
  getContexto(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('viajeId', ParseUUIDPipe) viajeId: string,
  ) {
    return this.entrega.getContexto(orgId, viajeId);
  }

  @Get('entregas/pallets/by-codigo/:codigo')
  @RequirePermission(PermissionSlug.EntregaRead)
  @ApiOperation({ summary: 'Lookup QR PAL-DSP en destino' })
  @ApiOkResponse({ type: EntregaPalletDto })
  getPalletByCodigo(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('codigo') codigo: string,
  ) {
    return this.entrega.getPalletByCodigo(orgId, codigo);
  }

  @Post('entregas/viajes/:viajeId/confirmar')
  @RequirePermission(PermissionSlug.EntregaWrite)
  @ApiOperation({ summary: 'Confirma POD y cierra el viaje' })
  @ApiCreatedResponse({ type: ProofOfDeliveryDto })
  confirmar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('viajeId', ParseUUIDPipe) viajeId: string,
    @CurrentUser() usuario: AuthUser,
    @Body() dto: ConfirmarEntregaDto,
  ) {
    return this.entrega.confirmarEntrega(orgId, usuario.id, viajeId, dto);
  }
}
