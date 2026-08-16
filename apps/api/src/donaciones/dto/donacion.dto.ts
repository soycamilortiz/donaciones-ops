import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DonacionImagenEstado,
  MAX_IMAGEN_BYTES,
  normalizarTipoImagen,
  TIPOS_IMAGEN_ACEPTADOS,
} from '@soschoco/shared';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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
