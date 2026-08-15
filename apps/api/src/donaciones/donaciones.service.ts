import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonacionImagenEstado, type SubidaAutorizada } from '@soschoco/shared';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { ColaService } from './cola.service';
import type { AutorizarSubidaDto, RegistrarImagenDto } from './dto/donacion.dto';

const IMAGEN_CON_PRODUCTO = {
  producto: {
    select: { id: true, nombre: true, marca: true, categoria: true, ean: true, alias: true },
  },
} as const;

@Injectable()
export class DonacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cola: ColaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Emite un token para que la PWA suba el archivo directo a Vercel Blob.
   *
   * La imagen nunca pasa por el API: una foto de móvil son varios MB y hacerla
   * viajar dos veces no aporta nada. El API solo decide si se puede subir y con
   * qué ruta.
   */
  async autorizarSubida(
    organizationId: string,
    dto: AutorizarSubidaDto,
  ): Promise<SubidaAutorizada> {
    const token = this.config.get('BLOB_READ_WRITE_TOKEN', { infer: true });
    if (!token) {
      throw new ServiceUnavailableException(
        'El almacenamiento de imágenes no está configurado (falta BLOB_READ_WRITE_TOKEN)',
      );
    }

    const extension = extensionDe(dto.nombreArchivo);
    const pathname = `donaciones/${organizationId}/${randomUUID()}${extension}`;

    const clientToken = await generateClientTokenFromReadWriteToken({
      token,
      pathname,
      allowedContentTypes: [dto.tipo],
      maximumSizeInBytes: dto.tamano,
      // El token caduca pronto: solo tiene que durar lo que tarda una subida.
      validUntil: Date.now() + 5 * 60 * 1000,
      addRandomSuffix: false,
    });

    return { pathname, clientToken };
  }

  /**
   * Registra la imagen ya subida y encola su reconocimiento. Se llama desde la
   * PWA cuando el Blob confirma la subida.
   */
  async registrarImagen(organizationId: string, usuarioId: string, dto: RegistrarImagenDto) {
    if (!dto.pathname.startsWith(`donaciones/${organizationId}/`)) {
      throw new ConflictException('El pathname no corresponde a esta organización');
    }

    if (dto.acopioId) {
      await this.verificarAcopio(organizationId, dto.acopioId);
    }

    const existente = await this.prisma.donacionImagen.findUnique({
      where: { blobPathname: dto.pathname },
    });
    if (existente) {
      throw new ConflictException('Esa imagen ya está registrada');
    }

    const imagen = await this.prisma.donacionImagen.create({
      data: {
        organizationId,
        acopioId: dto.acopioId ?? null,
        subidaPorId: usuarioId,
        blobUrl: dto.blobUrl,
        blobPathname: dto.pathname,
        estado: DonacionImagenEstado.Pendiente,
      },
      include: IMAGEN_CON_PRODUCTO,
    });

    await this.cola.encolarReconocimiento(imagen.id);
    return imagen;
  }

  async listar(organizationId: string, estado?: string) {
    return this.prisma.donacionImagen.findMany({
      where: { organizationId, ...(estado ? { estado: estado as DonacionImagenEstado } : {}) },
      include: IMAGEN_CON_PRODUCTO,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async obtener(organizationId: string, id: string) {
    const imagen = await this.prisma.donacionImagen.findFirst({
      where: { id, organizationId },
      include: IMAGEN_CON_PRODUCTO,
    });
    if (!imagen) {
      throw new NotFoundException('Imagen no encontrada');
    }
    return imagen;
  }

  /** Corrección manual para cuando el OCR no acertó o dejó la imagen sin producto. */
  async corregirProducto(organizationId: string, id: string, productoId: string) {
    await this.obtener(organizationId, id);

    const producto = await this.prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return this.prisma.donacionImagen.update({
      where: { id },
      data: { productoId, estado: DonacionImagenEstado.Procesada, error: null },
      include: IMAGEN_CON_PRODUCTO,
    });
  }

  /** Vuelve a encolar una imagen fallida, por ejemplo tras corregir el catálogo. */
  async reprocesar(organizationId: string, id: string) {
    const imagen = await this.obtener(organizationId, id);

    await this.prisma.donacionImagen.update({
      where: { id },
      data: { estado: DonacionImagenEstado.Pendiente, error: null },
    });
    await this.cola.encolarReconocimiento(imagen.id);

    return this.obtener(organizationId, id);
  }

  listarProductos() {
    return this.prisma.producto.findMany({ orderBy: { nombre: 'asc' } });
  }

  private async verificarAcopio(organizationId: string, acopioId: string): Promise<void> {
    const acopio = await this.prisma.acopio.findFirst({
      where: { id: acopioId, organizationId },
      select: { id: true },
    });
    if (!acopio) {
      throw new NotFoundException('Acopio no encontrado en esta organización');
    }
  }
}

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  if (punto <= 0 || punto === nombre.length - 1) {
    return '';
  }
  const extension = nombre.slice(punto).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(extension) ? extension : '';
}
