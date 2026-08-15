import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DonacionImagenEstado,
  MAX_IMAGEN_BYTES,
  type SubidaAutorizada,
  TIPOS_IMAGEN_ACEPTADOS,
} from '@soschoco/shared';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class AutorizarSubidaDto {
  @ApiProperty({
    example: 'colgate-frente.jpg',
    description: 'Nombre original del archivo; solo se usa para conservar la extensión',
  })
  @IsString()
  nombreArchivo: string;

  @ApiProperty({ enum: TIPOS_IMAGEN_ACEPTADOS, example: 'image/jpeg' })
  @IsIn([...TIPOS_IMAGEN_ACEPTADOS])
  tipo: string;

  @ApiProperty({ example: 512_000, maximum: MAX_IMAGEN_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_IMAGEN_BYTES)
  tamano: number;

  @ApiPropertyOptional({ description: 'Acopio al que se atribuye la donación' })
  @IsOptional()
  @IsUUID()
  acopioId?: string;
}

export class SubidaAutorizadaDto implements SubidaAutorizada {
  @ApiProperty()
  pathname: string;

  @ApiProperty({ description: 'Token de un solo uso para subir directo a Vercel Blob' })
  clientToken: string;
}

export class RegistrarImagenDto {
  @ApiProperty({ description: 'Pathname devuelto al autorizar la subida' })
  @IsString()
  pathname: string;

  @ApiProperty({ description: 'URL pública que devolvió Vercel Blob al subir' })
  @IsString()
  blobUrl: string;

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

  @ApiProperty({ description: 'URL de la imagen en Vercel Blob' })
  blobUrl: string;

  @ApiProperty({ enum: Object.values(DonacionImagenEstado) })
  estado: string;

  @ApiProperty()
  intentos: number;

  @ApiPropertyOptional()
  error?: string | null;

  @ApiPropertyOptional({ description: 'Texto crudo que devolvió el OCR' })
  textoOcr?: string | null;

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
