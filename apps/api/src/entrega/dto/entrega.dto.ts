import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntregaEstado } from '@prisma/client';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ConfirmarEntregaDto {
  @ApiProperty()
  @IsString()
  receivedBy!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiverDocument?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadRecibida?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadDanada?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadFaltante?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadDevuelta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class EntregaPalletDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  destinoNombre!: string;

  @ApiProperty()
  kitsEsperados!: number;

  @ApiPropertyOptional()
  pesoBrutoKg?: number | null;

  @ApiProperty()
  despachoCodigo!: string;
}

export class EntregaContextoDto {
  @ApiProperty()
  viajeId!: string;

  @ApiProperty()
  viajeCodigo!: string;

  @ApiProperty()
  despachoCodigo!: string;

  @ApiProperty()
  destinoNombre!: string;

  @ApiProperty()
  kitsEsperados!: number;

  @ApiProperty()
  palletsCount!: number;

  @ApiProperty({ type: [EntregaPalletDto] })
  pallets!: EntregaPalletDto[];

  @ApiPropertyOptional({ enum: EntregaEstado })
  entregaEstado?: EntregaEstado | null;
}

export class EntregaPendienteDto {
  @ApiProperty()
  viajeId!: string;

  @ApiProperty()
  viajeCodigo!: string;

  @ApiProperty()
  despachoCodigo!: string;

  @ApiPropertyOptional()
  destinoNombre?: string | null;

  @ApiProperty()
  kitsCargados!: number;

  @ApiPropertyOptional()
  salidaReal?: string | null;
}

export class ProofOfDeliveryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: EntregaEstado })
  estado!: EntregaEstado;

  @ApiPropertyOptional()
  cantidadEsperada?: number | null;

  @ApiPropertyOptional()
  cantidadRecibida?: number | null;

  @ApiProperty()
  cantidadDanada!: number;

  @ApiProperty()
  cantidadFaltante!: number;

  @ApiProperty()
  cantidadDevuelta!: number;

  @ApiPropertyOptional()
  receivedBy?: string | null;

  @ApiPropertyOptional()
  entregadoAt?: string | null;
}
