import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcopioFlujo } from '@prisma/client';
import type { Acopio } from '@soschoco/shared';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAcopioDto {
  @ApiProperty({ example: 'Acopio Istmina' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre: string;

  @ApiProperty({
    enum: AcopioFlujo,
    example: AcopioFlujo.RECIBIR,
    description: 'Si el punto recibe donaciones, las envía, o ambas',
  })
  @IsEnum(AcopioFlujo)
  flujo: AcopioFlujo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

export class UpdateAcopioDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre?: string;

  @ApiPropertyOptional({ enum: AcopioFlujo })
  @IsOptional()
  @IsEnum(AcopioFlujo)
  flujo?: AcopioFlujo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  municipio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

export class AcopioDto implements Acopio {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ enum: AcopioFlujo })
  flujo: AcopioFlujo;

  @ApiPropertyOptional()
  telefono?: string | null;

  @ApiPropertyOptional()
  descripcion?: string | null;

  @ApiPropertyOptional()
  municipio?: string | null;

  @ApiPropertyOptional()
  direccion?: string | null;

  @ApiPropertyOptional()
  lat?: number | null;

  @ApiPropertyOptional()
  lng?: number | null;
}
