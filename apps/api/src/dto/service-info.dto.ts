import { ApiProperty } from '@nestjs/swagger';

export class ServiceInfoDto {
  @ApiProperty({
    description: 'Identificador técnico del servicio',
    example: 'soschoco-api',
  })
  name: string;

  @ApiProperty({
    description: 'Nombre visible de la operación',
    example: 'SOS Chocó',
  })
  service: string;

  @ApiProperty({
    description: 'Ruta de Swagger UI',
    example: '/api/docs',
  })
  docs: string;
}
