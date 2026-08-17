import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryUnidad,
  RecepcionEstado,
  RecepcionPresentacion,
  RecepcionTipo,
  UnidadLogisticaTipo,
} from '@prisma/client';
import type { Recepcion as RecepcionContract } from '@soschoco/shared';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRecepcionDto {
  @ApiProperty()
  @IsUUID()
  acopioId: string;

  @ApiProperty({ enum: RecepcionTipo })
  @IsEnum(RecepcionTipo)
  tipo: RecepcionTipo;

  @ApiProperty({ enum: RecepcionPresentacion })
  @IsEnum(RecepcionPresentacion)
  presentacionFisica: RecepcionPresentacion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  donanteNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  donanteContacto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  procedencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  transportista?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiculoPlaca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  documentoTransporte?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Generar N unidades logísticas al abrir (camión / pallets)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  cantidadUnidades?: number;

  @ApiPropertyOptional({ enum: UnidadLogisticaTipo })
  @IsOptional()
  @IsEnum(UnidadLogisticaTipo)
  tipoUnidad?: UnidadLogisticaTipo;
}

export class GenerarUnidadesDto {
  @ApiProperty({ enum: UnidadLogisticaTipo })
  @IsEnum(UnidadLogisticaTipo)
  tipo: UnidadLogisticaTipo;

  @ApiProperty({ example: 18 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  cantidad: number;
}

export class CrearRecepcionItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unidadLogisticaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  marca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  presentacion?: string;

  @ApiPropertyOptional({ enum: InventoryUnidad })
  @IsOptional()
  @IsEnum(InventoryUnidad)
  unidad?: InventoryUnidad;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  loteCodigoOrigen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  vencimiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class InspeccionarItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidadAprobada: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidadCuarentena: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidadRechazada: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class RecepcionDto implements RecepcionContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  acopioId: string;

  @ApiPropertyOptional()
  acopioNombre?: string;

  @ApiProperty({ enum: RecepcionTipo })
  tipo: RecepcionTipo;

  @ApiProperty({ enum: RecepcionPresentacion })
  presentacionFisica: RecepcionPresentacion;

  @ApiProperty({ enum: RecepcionEstado })
  estado: RecepcionEstado;

  @ApiProperty()
  recibidaEn: string;

  @ApiPropertyOptional()
  donanteNombre?: string | null;

  @ApiPropertyOptional()
  donanteContacto?: string | null;

  @ApiPropertyOptional()
  procedencia?: string | null;

  @ApiPropertyOptional()
  transportista?: string | null;

  @ApiPropertyOptional()
  vehiculoPlaca?: string | null;

  @ApiPropertyOptional()
  documentoTransporte?: string | null;

  @ApiPropertyOptional()
  observaciones?: string | null;

  @ApiProperty()
  responsableId: string;

  @ApiPropertyOptional()
  validadaEn?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: 'array' })
  unidades: RecepcionContract['unidades'];

  @ApiProperty({ type: 'array' })
  items: RecepcionContract['items'];
}
