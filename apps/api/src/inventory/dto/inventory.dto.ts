import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryCategoria,
  InventoryDestinatario,
  InventoryEstado,
  InventoryUnidad,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  Allow,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { toOptionalBoolean } from '../../common/soft-delete';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Arroz' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre: string;

  @ApiProperty({ enum: InventoryCategoria })
  @IsEnum(InventoryCategoria)
  categoria: InventoryCategoria;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  categoriaDetalle?: string;

  @ApiPropertyOptional({ example: 'ARR-500' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  marca?: string;

  @ApiPropertyOptional({ example: '500 g' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  presentacion?: string;

  @ApiPropertyOptional({ example: 'M' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  talla?: string;

  @ApiPropertyOptional({ enum: InventoryDestinatario })
  @IsOptional()
  @IsEnum(InventoryDestinatario)
  destinatario?: InventoryDestinatario;

  @ApiProperty({ example: 24 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidad: number;

  @ApiProperty({ enum: InventoryUnidad })
  @IsEnum(InventoryUnidad)
  unidad: InventoryUnidad;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  unidadDetalle?: string;

  @ApiPropertyOptional({ example: '2027-06-15' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  vencimiento?: string;

  @ApiPropertyOptional({ enum: InventoryEstado })
  @IsOptional()
  @IsEnum(InventoryEstado)
  estado?: InventoryEstado;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  loteCodigo?: string;

  @ApiPropertyOptional({ example: 'Estante A-3' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  ubicacionInterna?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  donanteNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  donanteContacto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'Se ignora en el alta: el producto siempre nace activo',
  })
  @IsOptional()
  @Allow()
  isActive?: unknown;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre?: string;

  @ApiPropertyOptional({ enum: InventoryCategoria })
  @IsOptional()
  @IsEnum(InventoryCategoria)
  categoria?: InventoryCategoria;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  categoriaDetalle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  marca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  presentacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  talla?: string;

  @ApiPropertyOptional({ enum: InventoryDestinatario })
  @IsOptional()
  @IsEnum(InventoryDestinatario)
  destinatario?: InventoryDestinatario;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidad?: number;

  @ApiPropertyOptional({ enum: InventoryUnidad })
  @IsOptional()
  @IsEnum(InventoryUnidad)
  unidad?: InventoryUnidad;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  unidadDetalle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  vencimiento?: string;

  @ApiPropertyOptional({ enum: InventoryEstado })
  @IsOptional()
  @IsEnum(InventoryEstado)
  estado?: InventoryEstado;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  loteCodigo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  ubicacionInterna?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  donanteNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  donanteContacto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @ApiPropertyOptional({ description: 'false da de baja sin borrar el registro' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class InventoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  acopioId: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ enum: InventoryCategoria })
  categoria: InventoryCategoria;

  @ApiPropertyOptional()
  categoriaDetalle?: string | null;

  @ApiPropertyOptional()
  sku?: string | null;

  @ApiPropertyOptional()
  marca?: string | null;

  @ApiPropertyOptional()
  presentacion?: string | null;

  @ApiPropertyOptional()
  talla?: string | null;

  @ApiProperty({ enum: InventoryDestinatario })
  destinatario: InventoryDestinatario;

  @ApiProperty()
  cantidad: number;

  @ApiProperty({ enum: InventoryUnidad })
  unidad: InventoryUnidad;

  @ApiPropertyOptional()
  unidadDetalle?: string | null;

  @ApiPropertyOptional()
  vencimiento?: Date | null;

  @ApiProperty({ enum: InventoryEstado })
  estado: InventoryEstado;

  @ApiPropertyOptional()
  loteCodigo?: string | null;

  @ApiPropertyOptional()
  ubicacionInterna?: string | null;

  @ApiPropertyOptional()
  donanteNombre?: string | null;

  @ApiPropertyOptional()
  donanteContacto?: string | null;

  @ApiPropertyOptional()
  observaciones?: string | null;

  @ApiProperty()
  isActive: boolean;
}
