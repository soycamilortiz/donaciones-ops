import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../auth/public.decorator';
import { LivenessResponseDto, ReadinessResponseDto } from './dto/health.dto';
import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';

@ApiTags('health')
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness',
    description:
      'Comprueba que el proceso Nest está en pie. No toca PostgreSQL. Úsalo como probe de contenedor.',
  })
  @ApiOkResponse({ type: LivenessResponseDto })
  liveness(): LivenessResponseDto {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness',
    description:
      'Ejecuta SELECT 1 contra PostgreSQL. Responde 200 si la BD está arriba y 503 si no.',
  })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no responde',
    type: ReadinessResponseDto,
  })
  readiness() {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
