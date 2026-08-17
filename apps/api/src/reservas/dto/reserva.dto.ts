import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DemandaEstado, DemandaItemTipo, DemandaPrioridad, ReservaEstado } from '@prisma/client';
import type {
  Demanda as DemandaContract,
  DemandaItem as DemandaItemContract,
  KitComponente as KitComponenteContract,
  Kit as KitContract,
  PlanEscaso as PlanEscasoContract,
  ReservaAsignacion as ReservaAsignacionContract,
  Reserva as ReservaContract,
  ReservaItem as ReservaItemContract,
  SimulacionReserva as SimulacionReservaContract,
} from '@soschoco/shared';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class KitComponenteInputDto {
  @ApiProperty()
  @IsUUID()
  productoId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class CrearKitDto {
  @ApiProperty({ example: 'Kit alimentario familiar' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  codigo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional({ type: [KitComponenteInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KitComponenteInputDto)
  componentes?: KitComponenteInputDto[];
}

export class UpdateKitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class DemandaItemInputDto {
  @ApiProperty({ enum: DemandaItemTipo })
  @IsEnum(DemandaItemTipo)
  tipo: DemandaItemTipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  kitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class CrearDemandaDto {
  @ApiProperty()
  @IsUUID()
  acopioId: string;

  @ApiProperty({ example: 'Municipio X' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  destinoNombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  destinoMunicipio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  destinoDepartamento?: string;

  @ApiPropertyOptional({ enum: DemandaPrioridad })
  @IsOptional()
  @IsEnum(DemandaPrioridad)
  prioridad?: DemandaPrioridad;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaRequerida?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  poblacionAfectada?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipoEmergencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @ApiProperty({ type: [DemandaItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DemandaItemInputDto)
  items: DemandaItemInputDto[];
}

export class CrearReservaDto {
  @ApiProperty()
  @IsUUID()
  demandaItemId: string;

  @ApiPropertyOptional({
    description: 'Kits o unidades a comprometer. Default: el máximo posible.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad?: number;

  @ApiPropertyOptional({
    description: 'true = RESERVADA (bloquea stock). false = PRE_RESERVA (no bloquea).',
  })
  @IsOptional()
  @IsBoolean()
  firme?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class KitComponenteDto implements KitComponenteContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  kitId: string;

  @ApiProperty()
  productoId: string;

  @ApiPropertyOptional()
  productoNombre?: string;

  @ApiPropertyOptional()
  productoSku?: string;

  @ApiProperty()
  cantidad: number;
}

export class KitDto implements KitContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional({ nullable: true })
  descripcion?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [KitComponenteDto] })
  componentes: KitComponenteDto[];
}

export class DemandaItemDto implements DemandaItemContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  demandaId: string;

  @ApiProperty({ enum: DemandaItemTipo })
  tipo: DemandaItemTipo;

  @ApiPropertyOptional({ nullable: true })
  kitId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  kitCodigo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  kitNombre?: string | null;

  @ApiPropertyOptional({ nullable: true })
  productoId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  productoNombre?: string | null;

  @ApiProperty()
  cantidadSolicitada: number;

  @ApiProperty()
  cantidadCubierta: number;

  @ApiPropertyOptional()
  cantidadPosible?: number;

  @ApiPropertyOptional()
  deficit?: number;
}

export class DemandaDto implements DemandaContract {
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

  @ApiProperty()
  destinoNombre: string;

  @ApiPropertyOptional({ nullable: true })
  destinoMunicipio?: string | null;

  @ApiPropertyOptional({ nullable: true })
  destinoDepartamento?: string | null;

  @ApiProperty({ enum: DemandaPrioridad })
  prioridad: DemandaPrioridad;

  @ApiProperty({ enum: DemandaEstado })
  estado: DemandaEstado;

  @ApiPropertyOptional({ nullable: true })
  fechaRequerida?: string | null;

  @ApiPropertyOptional({ nullable: true })
  poblacionAfectada?: number | null;

  @ApiPropertyOptional({ nullable: true })
  tipoEmergencia?: string | null;

  @ApiPropertyOptional({ nullable: true })
  observaciones?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [DemandaItemDto] })
  items: DemandaItemDto[];

  @ApiPropertyOptional()
  cobertura?: number;
}

export class ReservaAsignacionDto implements ReservaAsignacionContract {
  @ApiPropertyOptional()
  id?: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiPropertyOptional()
  inventoryNombre?: string;

  @ApiPropertyOptional({ nullable: true })
  loteCodigo?: string | null;

  @ApiPropertyOptional({ nullable: true })
  vencimiento?: string | null;

  @ApiProperty()
  ubicacionId: string;

  @ApiPropertyOptional()
  ubicacionCodigo?: string;

  @ApiProperty()
  cantidad: number;
}

export class ReservaItemDto implements ReservaItemContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productoId: string;

  @ApiPropertyOptional()
  productoNombre?: string;

  @ApiProperty()
  cantidadRequerida: number;

  @ApiProperty()
  cantidadAsignada: number;

  @ApiProperty()
  deficit: number;

  @ApiProperty({ type: [ReservaAsignacionDto] })
  asignaciones: ReservaAsignacionDto[];
}

export class ReservaDto implements ReservaContract {
  @ApiProperty()
  id: string;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  acopioId: string;

  @ApiProperty()
  demandaId: string;

  @ApiPropertyOptional()
  demandaCodigo?: string;

  @ApiProperty()
  demandaItemId: string;

  @ApiPropertyOptional({ nullable: true })
  kitId?: string | null;

  @ApiProperty({ enum: ReservaEstado })
  estado: ReservaEstado;

  @ApiProperty()
  cantidad: number;

  @ApiPropertyOptional({ nullable: true })
  observaciones?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({ nullable: true })
  confirmedAt?: string | null;

  @ApiProperty({ type: [ReservaItemDto] })
  items: ReservaItemDto[];
}

export class SimulacionReservaDto implements SimulacionReservaContract {
  @ApiProperty()
  demandaItemId: string;

  @ApiProperty()
  solicitado: number;

  @ApiProperty()
  posible: number;

  @ApiProperty()
  deficit: number;

  @ApiProperty()
  cobertura: number;

  @ApiProperty()
  requerimientos: SimulacionReservaContract['requerimientos'];
}

export class PlanEscasoDto implements PlanEscasoContract {
  @ApiProperty()
  kitsPosibles: number;

  @ApiProperty()
  lineas: PlanEscasoContract['lineas'];
}
