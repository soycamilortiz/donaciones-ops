import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DonacionImagenEstado,
  MAX_IMAGEN_BYTES,
  normalizarTipoImagen,
  TIPOS_IMAGEN_ACEPTADOS,
} from '@soschoco/shared';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../storage/r2.service';
import { ColaService } from './cola.service';
import type { RegistrarImagenDto } from './dto/donacion.dto';

export type OpcionesListado = {
  estado?: string;
  cursor?: string;
  limite?: number;
};

const IMAGEN_CON_PRODUCTO = {
  producto: {
    select: { id: true, nombre: true, marca: true, categoria: true, ean: true, alias: true },
  },
  // Sin el nombre, el acopioId no sirve para mostrar nada en pantalla.
  acopio: { select: { id: true, nombre: true, municipio: true } },
} as const;

@Injectable()
export class DonacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cola: ColaService,
    private readonly r2: R2StorageService,
  ) {}

  /**
   * Reserva la clave en R2 y firma un PUT de 5 minutos. La PWA sube directo al
   * bucket; la imagen no pasa por el API.
   */
  async reservarSubida(organizationId: string, nombreArchivo: string, contentType: string) {
    if (!this.r2.isConfigured()) {
      throw new ServiceUnavailableException(
        `El almacenamiento de imágenes no está configurado (faltan ${this.r2.missingConfig().join(', ')})`,
      );
    }

    if (!this.r2.hasPublicBase()) {
      throw new ServiceUnavailableException(
        'El almacenamiento de imágenes no está configurado (falta R2_PUBLIC_BASE_URL)',
      );
    }

    const tipo = normalizarTipoImagen(contentType, nombreArchivo);
    if (!tipo) {
      throw new BadRequestException(`Formato no aceptado: ${contentType || 'desconocido'}`);
    }

    const pathname = this.rutaParaSubida(organizationId, nombreArchivo);
    const uploadUrl = await this.r2.presignPut(pathname, tipo);
    const publicUrl = this.r2.publicUrlFor(pathname);
    if (!publicUrl) {
      throw new ServiceUnavailableException(
        'El almacenamiento de imágenes no está configurado (falta R2_PUBLIC_BASE_URL)',
      );
    }

    return {
      pathname,
      uploadUrl,
      publicUrl,
      headers: { 'Content-Type': tipo },
      tiposAceptados: TIPOS_IMAGEN_ACEPTADOS,
      maxBytes: MAX_IMAGEN_BYTES,
    };
  }

  /** Ruta que la PWA debe pedir para una foto nueva. */
  rutaParaSubida(organizationId: string, nombreArchivo: string): string {
    return `donaciones/${organizationId}/${randomUUID()}${extensionDe(nombreArchivo)}`;
  }

  /**
   * Registra la imagen ya subida y encola su reconocimiento. Se llama desde la
   * PWA cuando R2 confirma la subida. La URL pública la arma el API; el cliente
   * no puede inyectar un host ajeno.
   */
  async registrarImagen(organizationId: string, usuarioId: string, dto: RegistrarImagenDto) {
    if (!perteneceA(dto.pathname, organizationId)) {
      throw new ForbiddenException('La ruta no corresponde a esta organización');
    }

    const blobUrl = this.r2.publicUrlFor(dto.pathname);
    if (!blobUrl) {
      throw new ServiceUnavailableException(
        'El almacenamiento de imágenes no está configurado (falta R2_PUBLIC_BASE_URL)',
      );
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
        blobUrl,
        blobPathname: dto.pathname,
        estado: DonacionImagenEstado.Pendiente,
      },
      include: IMAGEN_CON_PRODUCTO,
    });

    await this.cola.encolarReconocimiento(imagen.id);
    return imagen;
  }

  /**
   * Listado paginado por cursor y no por offset: las fotos se insertan sin parar
   * desde el campo, y con OFFSET una fila nueva desplaza la ventana y hace que
   * se repitan o se salten registros entre paginas.
   */
  async listar(organizationId: string, opciones: OpcionesListado = {}) {
    // El limite llega de la query string, asi que puede ser NaN ('?limite=abc')
    // o absurdo. Cualquier valor no utilizable cae al default en vez de
    // propagarse a Prisma.
    const pedido = opciones.limite;
    const limite =
      typeof pedido === 'number' && Number.isFinite(pedido) && pedido >= 1
        ? Math.min(Math.trunc(pedido), 200)
        : 50;

    const filas = await this.prisma.donacionImagen.findMany({
      where: {
        organizationId,
        ...(opciones.estado ? { estado: opciones.estado as DonacionImagenEstado } : {}),
      },
      include: IMAGEN_CON_PRODUCTO,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      // Se pide uno de mas para saber si hay pagina siguiente sin un count().
      take: limite + 1,
      ...(opciones.cursor ? { cursor: { id: opciones.cursor }, skip: 1 } : {}),
    });

    const hayMas = filas.length > limite;
    const items = hayMas ? filas.slice(0, limite) : filas;

    return {
      items,
      siguienteCursor: hayMas ? (items.at(-1)?.id ?? null) : null,
    };
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

/** Evita que una organización escriba (o registre) blobs de otra. */
function perteneceA(pathname: string, organizationId: string): boolean {
  return pathname.startsWith(`donaciones/${organizationId}/`) && !pathname.includes('..');
}

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  if (punto <= 0 || punto === nombre.length - 1) {
    return '';
  }
  const extension = nombre.slice(punto).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(extension) ? extension : '';
}
