import { ApiProperty } from '@nestjs/swagger';

export class LivenessResponseDto {
  @ApiProperty({
    description: 'El proceso HTTP está en pie. No comprueba la base de datos.',
    enum: ['ok'],
    example: 'ok',
  })
  status: 'ok';
}

export class HealthIndicatorDto {
  @ApiProperty({
    description: 'Estado del indicador',
    enum: ['up', 'down'],
    example: 'up',
  })
  status: 'up' | 'down';

  @ApiProperty({
    description: 'Detalle si el indicador está caído',
    required: false,
    example: 'Connection refused',
  })
  message?: string;
}

export class ReadinessIndicatorsDto {
  @ApiProperty({ type: HealthIndicatorDto })
  database: HealthIndicatorDto;
}

export class ReadinessResponseDto {
  @ApiProperty({
    description: 'ok si todos los indicadores responden; error si alguno falla',
    enum: ['ok', 'error', 'shutting_down'],
    example: 'ok',
  })
  status: 'ok' | 'error' | 'shutting_down';

  @ApiProperty({ type: ReadinessIndicatorsDto })
  info: ReadinessIndicatorsDto;

  @ApiProperty({
    description: 'Indicadores en fallo. Vacío cuando status es ok.',
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  error: Record<string, unknown>;

  @ApiProperty({
    description: 'Todos los indicadores (ok y en fallo)',
    type: ReadinessIndicatorsDto,
  })
  details: ReadinessIndicatorsDto;
}
