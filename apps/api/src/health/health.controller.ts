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
import { R2HealthIndicator } from './indicators/r2.health-indicator';

@ApiTags('health')
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly r2Health: R2HealthIndicator,
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

  @Get('storage')
  @HealthCheck()
  @ApiOperation({
    summary: 'Cloudflare R2',
    description:
      'HeadBucket contra el bucket configurado. 200 si las keys y el endpoint responden; 503 si faltan env o R2 rechaza la petición.',
  })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'R2 no configurado o no alcanzable',
    type: ReadinessResponseDto,
  })
  storage() {
    return this.health.check([() => this.r2Health.isHealthy('r2')]);
  }
}
