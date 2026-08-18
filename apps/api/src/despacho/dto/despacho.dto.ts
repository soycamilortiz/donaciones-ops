import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DespachoEstado,
  PalletDespachoEstado,
  PlanPalletizacionEstado,
  ViajeEstado,
} from '@prisma/client';
import type {
  Despacho,
  DespachoChecklist,
  DespachoManifiesto,
  PalletDespacho,
  PlanPalletizacion,
  PlanPalletSlot,
  ViajeResumen,
} from '@soschoco/shared';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CrearDespachoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsString()
  salidaProgramada?: string;
}

export class CrearViajeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehiculoId?: string;

  @ApiPropertyOptional({ example: 'ABC-123' })
  @IsOptional()
  @IsString()
  vehiculoPlaca?: string;

  @ApiPropertyOptional({ example: 'Camión' })
  @IsOptional()
  @IsString()
  vehiculoTipo?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vehiculoCapacidadKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  transportistaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportista?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  conductorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conductorNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conductorDocumento?: string;

  @ApiPropertyOptional({ description: 'Pallets a asignar a este viaje' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  palletsEsperados?: number;
}

export class ActualizarChecklistDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cargaCompleta?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  palletsIdentificados?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pesoVerificado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  destinoConfirmado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  vehiculoConfirmado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  conductorConfirmado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  documentacionCompleta?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sellosRegistrados?: boolean;
}

export class EscanearKitDto {
  @ApiProperty({ example: 'KIN-2026-000042' })
  @IsString()
  codigoKit!: string;
}

export class RetirarKitDto {
  @ApiProperty()
  @IsString()
  codigoKit!: string;

  @ApiProperty({ example: 'DAÑO' })
  @IsString()
  motivo!: string;
}

export class FinalizarPalletDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  pesoBrutoKg!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoPalletKg?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  altoM!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  anchoM!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  largoM!: number;
}

export class CargarPalletDto {
  @ApiProperty({ example: 'PAL-DSP-2026-000001' })
  @IsString()
  codigoPallet!: string;

  @ApiPropertyOptional({ description: 'Viaje destino; si no se envía, usa el viaje activo' })
  @IsOptional()
  @IsUUID()
  viajeId?: string;
}

export class ViajeResumenDto implements ViajeResumen {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty({ enum: ViajeEstado })
  estado!: ViajeEstado;

  @ApiPropertyOptional()
  vehiculoPlaca?: string | null;

  @ApiPropertyOptional()
  transportistaNombre?: string | null;

  @ApiPropertyOptional()
  conductorNombre?: string | null;

  @ApiProperty()
  palletsEsperados!: number;

  @ApiProperty()
  palletsCargados!: number;

  @ApiProperty()
  pesoCargadoKg!: number;
}

export class DespachoChecklistDto implements DespachoChecklist {
  @ApiProperty()
  cargaCompleta!: boolean;

  @ApiProperty()
  palletsIdentificados!: boolean;

  @ApiProperty()
  pesoVerificado!: boolean;

  @ApiProperty()
  destinoConfirmado!: boolean;

  @ApiProperty()
  vehiculoConfirmado!: boolean;

  @ApiProperty()
  conductorConfirmado!: boolean;

  @ApiProperty()
  documentacionCompleta!: boolean;

  @ApiProperty()
  sellosRegistrados!: boolean;
}

export class DespachoManifiestoDto implements DespachoManifiesto {
  @ApiProperty()
  origenNombre!: string;

  @ApiProperty()
  destinoNombre!: string;

  @ApiPropertyOptional()
  vehiculoPlaca?: string | null;

  @ApiPropertyOptional()
  conductorNombre?: string | null;

  @ApiPropertyOptional()
  transportistaNombre?: string | null;

  @ApiProperty()
  palletsCount!: number;

  @ApiProperty()
  kitsCount!: number;

  @ApiProperty()
  pesoKg!: number;

  @ApiProperty()
  generadoAt!: string;
}

export class PlanPalletSlotDto implements PlanPalletSlot {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sequence!: number;

  @ApiProperty()
  kitsObjetivo!: number;

  @ApiProperty()
  pesoTeoricoKg!: number;

  @ApiPropertyOptional()
  palletId?: string | null;

  @ApiPropertyOptional()
  palletCodigo?: string | null;

  @ApiPropertyOptional({ enum: PalletDespachoEstado })
  palletEstado?: PalletDespachoEstado | null;

  @ApiProperty()
  kitsActual!: number;
}

export class PlanPalletizacionDto implements PlanPalletizacion {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  consolidacionId!: string;

  @ApiPropertyOptional()
  consolidacionCodigo?: string;

  @ApiProperty()
  demandaId!: string;

  @ApiProperty()
  destinoNombre!: string;

  @ApiProperty({ enum: PlanPalletizacionEstado })
  estado!: PlanPalletizacionEstado;

  @ApiProperty()
  palletCount!: number;

  @ApiProperty()
  kitsPorPallet!: number;

  @ApiProperty()
  kitPesoKg!: number;

  @ApiProperty()
  palletPesoMaxKg!: number;

  @ApiProperty()
  kitsTotal!: number;

  @ApiProperty()
  palletsListos!: number;

  @ApiProperty({ type: [PlanPalletSlotDto] })
  slots!: PlanPalletSlotDto[];
}

export class PalletDespachoItemDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  kitInstanciaId?: string | null;

  @ApiPropertyOptional()
  kitCodigo?: string | null;

  @ApiPropertyOptional()
  escaneadoAt?: string | null;

  @ApiPropertyOptional()
  retiradoAt?: string | null;

  @ApiPropertyOptional()
  retiradoMotivo?: string | null;
}

export class PalletDespachoDto implements PalletDespacho {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  planId!: string;

  @ApiProperty()
  demandaId!: string;

  @ApiProperty()
  destinoNombre!: string;

  @ApiProperty()
  sequence!: number;

  @ApiProperty({ enum: PalletDespachoEstado })
  estado!: PalletDespachoEstado;

  @ApiProperty()
  kitsObjetivo!: number;

  @ApiProperty()
  kitsActual!: number;

  @ApiProperty()
  pesoPalletKg!: number;

  @ApiPropertyOptional()
  pesoNetoKg?: number | null;

  @ApiPropertyOptional()
  pesoBrutoKg?: number | null;

  @ApiPropertyOptional()
  altoM?: number | null;

  @ApiPropertyOptional()
  anchoM?: number | null;

  @ApiPropertyOptional()
  largoM?: number | null;

  @ApiPropertyOptional()
  despachoId?: string | null;

  @ApiProperty({ type: [PalletDespachoItemDto] })
  items!: PalletDespachoItemDto[];
}

export class DespachoDto implements Despacho {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  acopioId!: string;

  @ApiPropertyOptional()
  acopioNombre?: string;

  @ApiProperty()
  planId!: string;

  @ApiPropertyOptional()
  planCodigo?: string;

  @ApiProperty()
  demandaId!: string;

  @ApiPropertyOptional()
  demandaCodigo?: string;

  @ApiProperty()
  destinoNombre!: string;

  @ApiProperty({ enum: DespachoEstado })
  estado!: DespachoEstado;

  @ApiProperty()
  palletsEsperados!: number;

  @ApiProperty()
  palletsCargados!: number;

  @ApiProperty()
  palletsDespachados!: number;

  @ApiProperty()
  kitsEsperados!: number;

  @ApiProperty()
  kitsCargados!: number;

  @ApiProperty()
  kitsDespachados!: number;

  @ApiProperty()
  pesoTotalKg!: number;

  @ApiProperty()
  esParcial!: boolean;

  @ApiPropertyOptional()
  observaciones?: string | null;

  @ApiPropertyOptional()
  vehiculoPlaca?: string | null;

  @ApiPropertyOptional()
  transportista?: string | null;

  @ApiPropertyOptional()
  conductorNombre?: string | null;

  @ApiPropertyOptional()
  conductorDocumento?: string | null;

  @ApiPropertyOptional()
  documentoTransporte?: string | null;

  @ApiPropertyOptional()
  salidaProgramada?: string | null;

  @ApiPropertyOptional()
  salidaReal?: string | null;

  @ApiProperty({ type: [ViajeResumenDto] })
  viajes!: ViajeResumenDto[];

  @ApiPropertyOptional({ type: DespachoChecklistDto })
  checklist?: DespachoChecklistDto | null;

  @ApiPropertyOptional({ type: DespachoManifiestoDto })
  manifiesto?: DespachoManifiestoDto | null;

  @ApiProperty({ type: [Object] })
  pallets!: Array<Pick<PalletDespacho, 'id' | 'codigo' | 'sequence' | 'estado'>>;
}
