import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConsolidacionEstado,
  ControlLoteEstado,
  ControlModo,
  ControlResultado,
  KitInstanciaEstado,
} from '@prisma/client';
import type {
  Consolidacion as ConsolidacionContract,
  ControlLote as ControlLoteContract,
  KitInstancia as KitInstanciaContract,
  PipelineDemanda as PipelineContract,
} from '@soschoco/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class ArmarKitsDto {
  @ApiProperty()
  @IsUUID()
  reservaId: string;
}

export class CrearControlDto {
  @ApiProperty()
  @IsUUID()
  reservaId: string;

  @ApiPropertyOptional({ enum: ControlModo })
  @IsOptional()
  @IsEnum(ControlModo)
  modo?: ControlModo;

  @ApiPropertyOptional({ description: 'Porcentaje de muestra 0–1. Default 0.1' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1)
  porcentajeMuestra?: number;

  @ApiPropertyOptional({ description: 'Umbral de defecto 0–1. Default 0.05' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  umbralDefecto?: number;
}

export class InspeccionarKitDto {
  @ApiProperty({ enum: ControlResultado })
  @IsEnum(ControlResultado)
  resultado: ControlResultado;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class CrearConsolidacionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  kitPesoKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  palletPesoMaxKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  kitAltoM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  palletAltoMaxM?: number;
}

export class ConfirmarPickLineaDto {
  @ApiProperty({ description: 'Código escaneado de la ubicación origen' })
  @IsString()
  @MinLength(1)
  codigoOrigen: string;

  @ApiProperty({ description: 'Código escaneado de la zona kitting/picking destino' })
  @IsString()
  @MinLength(1)
  codigoDestino: string;
}

export class KitInstanciaDto implements KitInstanciaContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  reservaId: string;

  @ApiProperty()
  demandaId: string;

  @ApiProperty()
  kitId: string;

  @ApiPropertyOptional()
  kitNombre?: string;

  @ApiProperty({ enum: KitInstanciaEstado })
  estado: KitInstanciaEstado;

  @ApiPropertyOptional({ nullable: true })
  zonaKittingCodigo?: string | null;

  @ApiProperty()
  items: KitInstanciaContract['items'];
}

export class ControlLoteDto implements ControlLoteContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  reservaId: string;

  @ApiProperty()
  demandaId: string;

  @ApiProperty({ enum: ControlModo })
  modo: ControlModo;

  @ApiProperty()
  muestraObjetivo: number;

  @ApiProperty()
  umbralDefecto: number;

  @ApiProperty({ enum: ControlLoteEstado })
  estado: ControlLoteEstado;

  @ApiProperty()
  inspeccionados: number;

  @ApiProperty()
  defectuosos: number;

  @ApiProperty()
  tasaDefecto: number;

  @ApiProperty()
  requiereTotal: boolean;

  @ApiProperty()
  inspecciones: ControlLoteContract['inspecciones'];
}

export class ConsolidacionDto implements ConsolidacionContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  demandaId: string;

  @ApiPropertyOptional()
  demandaCodigo?: string;

  @ApiProperty()
  destinoNombre: string;

  @ApiProperty({ enum: ConsolidacionEstado })
  estado: ConsolidacionEstado;

  @ApiProperty()
  kitPesoKg: number;

  @ApiProperty()
  palletPesoMaxKg: number;

  @ApiPropertyOptional({ nullable: true })
  kitAltoM?: number | null;

  @ApiPropertyOptional({ nullable: true })
  palletAltoMaxM?: number | null;

  @ApiProperty()
  kits: number;

  @ApiProperty()
  propuesta: ConsolidacionContract['propuesta'];
}

export class PipelineDemandaDto implements PipelineContract {
  @ApiProperty()
  solicitado: number;

  @ApiProperty()
  reservado: number;

  @ApiProperty()
  pendientePick: number;

  @ApiProperty()
  armado: number;

  @ApiProperty()
  aprobado: number;

  @ApiProperty()
  observado: number;

  @ApiProperty()
  rechazado: number;

  @ApiProperty()
  consolidado: number;

  @ApiProperty()
  palletizado: number;
}
