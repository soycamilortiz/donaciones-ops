import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryMovimientoTipo,
  PutawayEstado,
  UbicacionEstado,
  UbicacionFuncion,
  UbicacionTipo,
} from '@prisma/client';
import type {
  InventoryMovimiento as InventoryMovimientoContract,
  Putaway as PutawayContract,
  PutawayLinea as PutawayLineaContract,
  Ubicacion as UbicacionContract,
} from '@soschoco/shared';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateUbicacionDto {
  @ApiProperty({ example: 'B03-R02-N01' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  codigo: string;

  @ApiProperty({ example: 'Rack alimentos pasillo 3' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ enum: UbicacionTipo })
  @IsEnum(UbicacionTipo)
  tipo: UbicacionTipo;

  @ApiProperty({ enum: UbicacionFuncion })
  @IsEnum(UbicacionFuncion)
  funcion: UbicacionFuncion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacidadPesoKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacidadVolumen?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacidadUnidades?: number;

  @ApiPropertyOptional({ example: '15-25 °C' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  zonaTemperatura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permiteAlimentos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permiteMedicamentos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permiteRopa?: boolean;
}

export class UpdateUbicacionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({ enum: UbicacionTipo })
  @IsOptional()
  @IsEnum(UbicacionTipo)
  tipo?: UbicacionTipo;

  @ApiPropertyOptional({ enum: UbicacionFuncion })
  @IsOptional()
  @IsEnum(UbicacionFuncion)
  funcion?: UbicacionFuncion;

  @ApiPropertyOptional({ enum: UbicacionEstado })
  @IsOptional()
  @IsEnum(UbicacionEstado)
  estado?: UbicacionEstado;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacidadPesoKg?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacidadVolumen?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacidadUnidades?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  zonaTemperatura?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permiteAlimentos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permiteMedicamentos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permiteRopa?: boolean;
}

export class PutawayLineaInputDto {
  @ApiProperty()
  @IsUUID()
  destinoUbicacionId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class CrearPutawayDto {
  @ApiProperty({ type: [PutawayLineaInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PutawayLineaInputDto)
  lineas: PutawayLineaInputDto[];
}

export class ConfirmarPutawayLineaDto {
  @ApiProperty()
  @IsUUID()
  lineaId: string;

  @ApiProperty({
    description: 'Código de la ubicación destino, como se lee en el QR o la etiqueta',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  codigoDestino: string;
}

export class ConfirmarPutawayDto {
  @ApiProperty({ type: [ConfirmarPutawayLineaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmarPutawayLineaDto)
  lineas: ConfirmarPutawayLineaDto[];
}

export class UbicacionDto implements UbicacionContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  acopioId: string;

  @ApiPropertyOptional({ nullable: true })
  parentId?: string | null;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ enum: UbicacionTipo })
  tipo: UbicacionTipo;

  @ApiProperty({ enum: UbicacionFuncion })
  funcion: UbicacionFuncion;

  @ApiProperty({ enum: UbicacionEstado })
  estado: UbicacionEstado;

  @ApiPropertyOptional({ nullable: true })
  capacidadPesoKg?: number | null;

  @ApiPropertyOptional({ nullable: true })
  capacidadVolumen?: number | null;

  @ApiPropertyOptional({ nullable: true })
  capacidadUnidades?: number | null;

  @ApiProperty()
  ocupacionUnidades: number;

  @ApiPropertyOptional({ nullable: true })
  disponibleUnidades?: number | null;

  @ApiPropertyOptional({ nullable: true })
  zonaTemperatura?: string | null;

  @ApiProperty()
  permiteAlimentos: boolean;

  @ApiProperty()
  permiteMedicamentos: boolean;

  @ApiProperty()
  permiteRopa: boolean;

  @ApiProperty()
  esSistema: boolean;

  @ApiProperty()
  isActive: boolean;
}

export class PutawayLineaDto implements PutawayLineaContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  origenUbicacionId: string;

  @ApiPropertyOptional()
  origenCodigo?: string;

  @ApiProperty()
  destinoUbicacionId: string;

  @ApiPropertyOptional()
  destinoCodigo?: string;

  @ApiProperty()
  cantidad: number;

  @ApiProperty({ enum: PutawayEstado })
  estado: PutawayEstado;
}

export class CrearMovimientoDto {
  @ApiProperty()
  @IsUUID()
  inventoryItemId: string;

  @ApiProperty()
  @IsUUID()
  origenUbicacionId: string;

  @ApiProperty()
  @IsUUID()
  destinoUbicacionId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @ApiProperty({
    description: 'Código de la ubicación destino, como se lee en la etiqueta',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  codigoDestino: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class InventoryMovimientoDto implements InventoryMovimientoContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  acopioId: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiPropertyOptional()
  inventoryNombre?: string;

  @ApiPropertyOptional({ nullable: true })
  loteCodigo?: string | null;

  @ApiProperty({ enum: InventoryMovimientoTipo })
  tipo: InventoryMovimientoTipo;

  @ApiProperty()
  cantidad: number;

  @ApiPropertyOptional({ nullable: true })
  origenUbicacionId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  origenCodigo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  destinoUbicacionId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  destinoCodigo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  observaciones?: string | null;

  @ApiProperty()
  createdAt: string;
}

export class PutawayDto implements PutawayContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  acopioId: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty({ enum: PutawayEstado })
  estado: PutawayEstado;

  @ApiProperty({ type: [PutawayLineaDto] })
  lineas: PutawayLineaDto[];

  @ApiPropertyOptional()
  inventoryNombre?: string;

  @ApiPropertyOptional({ nullable: true })
  loteCodigo?: string | null;
}
