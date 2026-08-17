import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryUnidad } from '@prisma/client';
import {
  DonacionImagenEstado,
  FuenteCatalogo,
  MAX_IMAGEN_BYTES,
  normalizarTipoImagen,
  TIPOS_IMAGEN_ACEPTADOS,
} from '@soschoco/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class NuevaRutaDto {
  @ApiProperty({
    example: 'colgate-frente.jpg',
    description: 'Nombre original del archivo; solo se usa para conservar la extensión',
  })
  @IsString()
  nombreArchivo: string;

  @ApiProperty({ enum: TIPOS_IMAGEN_ACEPTADOS })
  @Transform(({ value, obj }) => normalizarTipoImagen(value, obj.nombreArchivo) ?? value)
  @IsIn([...TIPOS_IMAGEN_ACEPTADOS])
  contentType: string;
}

export class RutaSubidaDto {
  @ApiProperty({
    example: 'donaciones/<orgId>/9f1c….jpg',
    description: 'Clave del objeto en R2',
  })
  pathname: string;

  @ApiProperty({ description: 'PUT firmado (5 minutos) contra el endpoint S3 de R2' })
  uploadUrl: string;

  @ApiProperty({ description: 'URL pública para <img> y para el worker' })
  publicUrl: string;

  @ApiProperty({ example: { 'Content-Type': 'image/jpeg' } })
  headers: Record<string, string>;

  @ApiProperty({ enum: TIPOS_IMAGEN_ACEPTADOS, isArray: true })
  tiposAceptados: readonly string[];

  @ApiProperty({ example: MAX_IMAGEN_BYTES })
  maxBytes: number;
}

export class RegistrarImagenDto {
  @ApiProperty({ description: 'Pathname devuelto al reservar la subida' })
  @IsString()
  pathname: string;

  @ApiPropertyOptional({
    description: 'Ignorado: la URL pública la arma el API con R2_PUBLIC_BASE_URL',
  })
  @IsOptional()
  @IsString()
  blobUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  acopioId?: string;
}

export class ProductoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional()
  marca?: string | null;

  @ApiPropertyOptional()
  categoria?: string | null;

  @ApiPropertyOptional()
  ean?: string | null;

  @ApiProperty({ type: [String] })
  alias: string[];
}

export class DonacionImagenDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  acopioId?: string | null;

  @ApiProperty({ description: 'URL pública de la imagen en Cloudflare R2' })
  blobUrl: string;

  @ApiProperty({ enum: Object.values(DonacionImagenEstado) })
  estado: string;

  @ApiProperty()
  intentos: number;

  @ApiPropertyOptional()
  error?: string | null;

  @ApiPropertyOptional({ description: 'Texto crudo que devolvió el OCR' })
  textoOcr?: string | null;

  @ApiPropertyOptional()
  nombreDetectado?: string | null;

  @ApiPropertyOptional()
  cantidadDetectada?: number | null;

  @ApiPropertyOptional()
  confirmadaEn?: Date | null;

  @ApiPropertyOptional({ description: 'Confianza del reconocimiento, 0..1' })
  confianza?: number | null;

  @ApiPropertyOptional({ type: ProductoDto, description: 'Null si quedó para revisión manual' })
  producto?: ProductoDto | null;

  @ApiPropertyOptional()
  procesadaEn?: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class CorregirProductoDto {
  @ApiProperty({ description: 'Producto correcto, cuando el reconocimiento falló' })
  @IsUUID()
  productoId: string;
}

export class ConfirmarDonacionDto {
  @ApiProperty({ example: 'Botellas de agua x6 marca Brisa' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  acopioId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({
    description: 'Sumar a este ítem aunque el nombre no coincida letra a letra',
  })
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @ApiPropertyOptional({ description: 'Recepción a la que se cuelga esta foto' })
  @IsOptional()
  @IsUUID()
  recepcionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unidadLogisticaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @ApiPropertyOptional({ description: 'Alta en catálogo si no hay match' })
  @IsOptional()
  @IsBoolean()
  crearProducto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{8,14}$/)
  ean?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  presentacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  loteCodigoOrigen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vencimiento?: string;

  @ApiPropertyOptional({ enum: InventoryUnidad })
  @IsOptional()
  @IsEnum(InventoryUnidad)
  unidad?: InventoryUnidad;
}

export class PaginaDonacionImagenDto {
  @ApiProperty({ type: [DonacionImagenDto] })
  items: DonacionImagenDto[];

  @ApiPropertyOptional({
    description: 'Pasar como `cursor` para la página siguiente. Null si ya no hay más',
    nullable: true,
  })
  siguienteCursor: string | null;
}

export class ConsultaEanDto {
  @ApiProperty({ enum: Object.values(FuenteCatalogo) })
  fuente: string;

  @ApiProperty()
  ean: string;

  @ApiPropertyOptional({ nullable: true })
  nombre: string | null;

  @ApiPropertyOptional({ nullable: true })
  marca: string | null;

  @ApiPropertyOptional({ nullable: true })
  imagenUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  productoId: string | null;
}

export class RegistrarEntradaDto {
  @ApiProperty({ example: 'Botellas de agua x6' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre: string;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @ApiProperty()
  @IsUUID()
  acopioId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  marca?: string;

  @ApiPropertyOptional({ example: '7702006400011' })
  @IsOptional()
  @Matches(/^\d{8,14}$/)
  ean?: string;
}

export class EntradaDonacionDto {
  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  cantidad: number;

  @ApiPropertyOptional({ nullable: true })
  ean: string | null;
}

export class InterpretarImagenDto {
  @ApiPropertyOptional({ description: 'EAN leído en la PWA con BarcodeDetector' })
  @IsOptional()
  @Matches(/^\d{8,14}$/)
  ean?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  acopioId?: string;
}

export class CoincidenciaInventarioDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional({ nullable: true })
  marca: string | null;

  @ApiProperty()
  cantidad: number;

  @ApiProperty()
  score: number;

  @ApiPropertyOptional()
  unidadBase?: string;

  @ApiPropertyOptional()
  requiereLote?: boolean;

  @ApiPropertyOptional()
  requiereVencimiento?: boolean;
}

export class InterpretacionDto {
  @ApiProperty({ enum: ['ean', 'vision', 'manual'] })
  via: string;

  @ApiPropertyOptional({ nullable: true })
  fuenteEan: string | null;

  @ApiPropertyOptional({ nullable: true })
  ean: string | null;

  @ApiPropertyOptional({ nullable: true })
  nombre: string | null;

  @ApiPropertyOptional({ nullable: true })
  marca: string | null;

  @ApiPropertyOptional({ nullable: true })
  cantidad: number | null;

  @ApiProperty({ type: [CoincidenciaInventarioDto] })
  coincidencias: CoincidenciaInventarioDto[];
}
