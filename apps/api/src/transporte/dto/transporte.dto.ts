import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EntregaEstado,
  TransportEventTipo,
  TransportistaTipo,
  ViajeEstado,
  ViajeParadaEstado,
  VehiculoEstado,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CrearTransportistaDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiPropertyOptional({ enum: TransportistaTipo })
  @IsOptional()
  @IsEnum(TransportistaTipo)
  tipo?: TransportistaTipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contacto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

export class CrearVehiculoDto {
  @ApiProperty({ example: 'ABC-123' })
  @IsString()
  placa!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  transportistaId?: string;

  @ApiPropertyOptional({ example: 'Camión' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacidadKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacidadM3?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  numEjes?: number;

  @ApiPropertyOptional({ enum: VehiculoEstado })
  @IsOptional()
  @IsEnum(VehiculoEstado)
  estado?: VehiculoEstado;
}

export class CrearConductorDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiProperty()
  @IsString()
  documento!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  transportistaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipoLicencia?: string;
}

export class CrearRutaParadaDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  sequence!: number;

  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiPropertyOptional({ description: 'Municipio o punto de descarga en esta parada' })
  @IsOptional()
  @IsString()
  destinoNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class CrearRutaDto {
  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ type: [CrearRutaParadaDto] })
  paradas!: CrearRutaParadaDto[];
}

export class CrearViajeParadaDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  sequence!: number;

  @ApiProperty()
  @IsString()
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinoNombre?: string;
}

export class CrearViajeParadasDto {
  @ApiPropertyOptional({ description: 'Copia paradas desde una ruta plantilla' })
  @IsOptional()
  @IsUUID()
  rutaId?: string;

  @ApiPropertyOptional({ type: [CrearViajeParadaDto] })
  @IsOptional()
  paradas?: CrearViajeParadaDto[];
}

export class RegistrarTransportEventDto {
  @ApiProperty({ enum: TransportEventTipo })
  @IsEnum(TransportEventTipo)
  tipo!: TransportEventTipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaHora?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ubicacionNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class TransportEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: TransportEventTipo })
  tipo!: TransportEventTipo;

  @ApiProperty()
  fechaHora!: string;

  @ApiPropertyOptional()
  ubicacionNombre?: string | null;

  @ApiPropertyOptional()
  observaciones?: string | null;
}

export class ViajeParadaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sequence!: number;

  @ApiProperty()
  nombre!: string;

  @ApiPropertyOptional()
  destinoNombre?: string | null;

  @ApiProperty({ enum: ViajeParadaEstado })
  estado!: ViajeParadaEstado;

  @ApiProperty({ type: [String] })
  palletCodigos!: string[];

  @ApiProperty()
  palletsCount!: number;

  @ApiProperty()
  kitsCount!: number;
}

export class CargaPalletDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  destinoNombre!: string;

  @ApiProperty()
  kitsCount!: number;

  @ApiPropertyOptional()
  pesoBrutoKg?: number | null;

  @ApiPropertyOptional()
  paradaId?: string | null;

  @ApiPropertyOptional()
  paradaNombre?: string | null;
}

export class AsignarPalletParadaDto {
  @ApiProperty({ example: 'PAL-DSP-2026-000042' })
  @IsString()
  codigoPallet!: string;
}

export class AutoAsignarResultDto {
  @ApiProperty()
  asignados!: number;

  @ApiProperty()
  sinAsignar!: number;
}

export class ViajeDetalleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty({ enum: ViajeEstado })
  estado!: ViajeEstado;

  @ApiProperty()
  despachoId!: string;

  @ApiProperty()
  despachoCodigo!: string;

  @ApiPropertyOptional()
  origenNombre?: string | null;

  @ApiPropertyOptional()
  destinoNombre?: string | null;

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
  kitsEsperados!: number;

  @ApiProperty()
  kitsCargados!: number;

  @ApiProperty()
  pesoCargadoKg!: number;

  @ApiPropertyOptional()
  salidaProgramada?: string | null;

  @ApiPropertyOptional()
  salidaReal?: string | null;

  @ApiPropertyOptional()
  llegadaEstimada?: string | null;

  @ApiPropertyOptional()
  llegadaReal?: string | null;

  @ApiPropertyOptional()
  observaciones?: string | null;

  @ApiProperty({ type: [ViajeParadaDto] })
  paradas!: ViajeParadaDto[];

  @ApiProperty({ type: [TransportEventDto] })
  eventos!: TransportEventDto[];

  @ApiPropertyOptional({ enum: EntregaEstado })
  entregaEstado?: EntregaEstado | null;

  @ApiPropertyOptional()
  rutaId?: string | null;

  @ApiProperty()
  palletsSinAsignar!: number;
}

export class ViajeResumenTransporteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty({ enum: ViajeEstado })
  estado!: ViajeEstado;

  @ApiProperty()
  despachoCodigo!: string;

  @ApiPropertyOptional()
  destinoNombre?: string | null;

  @ApiPropertyOptional()
  vehiculoPlaca?: string | null;

  @ApiProperty()
  palletsCargados!: number;

  @ApiProperty()
  kitsCargados!: number;

  @ApiPropertyOptional()
  salidaReal?: string | null;

  @ApiPropertyOptional({ enum: EntregaEstado })
  entregaEstado?: EntregaEstado | null;
}

export class TransportistaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ enum: TransportistaTipo })
  tipo!: TransportistaTipo;

  @ApiPropertyOptional()
  documento?: string | null;

  @ApiPropertyOptional()
  telefono?: string | null;

  @ApiPropertyOptional()
  email?: string | null;
}

export class VehiculoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  placa!: string;

  @ApiPropertyOptional()
  tipo?: string | null;

  @ApiPropertyOptional()
  capacidadKg?: number | null;

  @ApiProperty({ enum: VehiculoEstado })
  estado!: VehiculoEstado;
}

export class ConductorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  documento!: string;

  @ApiPropertyOptional()
  telefono?: string | null;
}

export class RutaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  nombre!: string;

  @ApiPropertyOptional()
  descripcion?: string | null;

  @ApiProperty({ type: [CrearRutaParadaDto] })
  paradas!: Array<CrearRutaParadaDto & { destinoNombre?: string }>;
}
