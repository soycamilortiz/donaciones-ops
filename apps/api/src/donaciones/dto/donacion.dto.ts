import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DonacionImagenEstado, MAX_IMAGEN_BYTES, TIPOS_IMAGEN_ACEPTADOS } from '@soschoco/shared';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class NuevaRutaDto {
  @ApiProperty({
    example: 'colgate-frente.jpg',
    description: 'Nombre original del archivo; solo se usa para conservar la extensión',
  })
  @IsString()
  nombreArchivo: string;
}

export class RutaSubidaDto {
  @ApiProperty({
    example: 'donaciones/<orgId>/9f1c….jpg',
    description: 'Ruta que la PWA debe pasar a upload() del SDK de Vercel Blob',
  })
  pathname: string;

  @ApiProperty({ enum: TIPOS_IMAGEN_ACEPTADOS, isArray: true })
  tiposAceptados: readonly string[];

  @ApiProperty({ example: MAX_IMAGEN_BYTES })
  maxBytes: number;
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

export class PaginaDonacionImagenDto {
  @ApiProperty({ type: [DonacionImagenDto] })
  items: DonacionImagenDto[];

  @ApiPropertyOptional({
    description: 'Pasar como `cursor` para la página siguiente. Null si ya no hay más',
    nullable: true,
  })
  siguienteCursor: string | null;
}
