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
  IMAGEN_FORMATO_ALMACENAMIENTO,
  IMAGEN_PESO_MAX,
  MAX_IMAGEN_BYTES,
  normalizarTipoImagen,
  TIPOS_IMAGEN_ACEPTADOS,
} from '@soschoco/shared';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../storage/r2.service';
import { ColaService } from './cola.service';
import type {
  ConfirmarDonacionDto,
  InterpretarImagenDto,
  RegistrarEntradaDto,
  RegistrarImagenDto,
} from './dto/donacion.dto';
import { OpenFoodFactsService } from './open-food-facts.service';
import { VisionProductoService } from './vision-producto.service';

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
    private readonly inventario: InventoryService,
    private readonly off: OpenFoodFactsService,
    private readonly vision: VisionProductoService,
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

    const tipo = normalizarTipoImagen(contentType, nombreArchivo);
    if (!tipo) {
      throw new BadRequestException(`Formato no aceptado: ${contentType || 'desconocido'}`);
    }

    const pathname = this.rutaParaSubida(organizationId, nombreArchivo, tipo);
    const uploadUrl = await this.r2.presignPut(pathname, tipo);
    const publicUrl = await this.r2.urlParaMostrar(pathname);

    return {
      pathname,
      uploadUrl,
      publicUrl,
      headers: { 'Content-Type': tipo },
      tiposAceptados: TIPOS_IMAGEN_ACEPTADOS,
      maxBytes: IMAGEN_PESO_MAX,
      maxBytesEntrada: MAX_IMAGEN_BYTES,
    };
  }

  /** Ruta que la PWA debe pedir para una foto nueva. */
  rutaParaSubida(organizationId: string, nombreArchivo: string, contentType?: string): string {
    const tipo = contentType ?? normalizarTipoImagen(undefined, nombreArchivo);
    const extension =
      tipo === IMAGEN_FORMATO_ALMACENAMIENTO ? '.jpg' : extensionDe(nombreArchivo);
    return `donaciones/${organizationId}/${randomUUID()}${extension || '.jpg'}`;
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

    if (this.r2.isConfigured()) {
      const objeto = await this.r2.headObject(dto.pathname);
      if (objeto.contentLength > IMAGEN_PESO_MAX) {
        throw new BadRequestException(
          `La foto supera ${Math.round(IMAGEN_PESO_MAX / 1024 / 1024)} MB tras subirla`,
        );
      }
    }

    const blobUrl =
      this.r2.publicUrlFor(dto.pathname) ?? `r2://${this.r2.bucket}/${dto.pathname}`;

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

    // El reconocimiento lo dispara la PWA: EAN y, si no, visión. Tesseract
    // queda para reprocesar fotos viejas.
    return this.conUrlVisible(imagen);
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
    const visibles = await Promise.all(items.map((item) => this.conUrlVisible(item)));

    return {
      items: visibles,
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
    return this.conUrlVisible(imagen);
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
    }).then((imagen) => this.conUrlVisible(imagen));
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

  /**
   * El inventario solo se toca aquí: el OCR sugiere, el operador confirma.
   */
  async confirmarDonacion(organizationId: string, id: string, dto: ConfirmarDonacionDto) {
    const imagen = await this.prisma.donacionImagen.findFirst({
      where: { id, organizationId },
    });
    if (!imagen) {
      throw new NotFoundException('Imagen no encontrada');
    }
    if (imagen.confirmadaEn) {
      throw new ConflictException('Esta donación ya se confirmó y está en el inventario');
    }
    if (imagen.estado === DonacionImagenEstado.Fallida) {
      throw new BadRequestException('Reprocesá la foto antes de confirmarla');
    }

    const acopioId = dto.acopioId ?? imagen.acopioId;
    if (!acopioId) {
      throw new BadRequestException('Elegí el acopio donde entra esta donación');
    }
    await this.verificarAcopio(organizationId, acopioId);

    const item = await this.inventario.aplicarDonacionConfirmada(organizationId, acopioId, {
      nombre: dto.nombre,
      cantidad: dto.cantidad,
      marca: dto.marca,
      inventoryItemId: dto.inventoryItemId,
    });

    await this.prisma.donacionImagen.update({
      where: { id },
      data: {
        acopioId,
        nombreDetectado: dto.nombre.trim(),
        cantidadDetectada: dto.cantidad,
        confirmadaEn: new Date(),
        inventoryItemId: item.id,
        estado: DonacionImagenEstado.Procesada,
        error: null,
      },
    });

    return this.obtener(organizationId, id);
  }

  listarProductos() {
    return this.prisma.producto.findMany({ orderBy: { nombre: 'asc' } });
  }

  /**
   * 1) catálogo local (`productos.ean`) 2) Open Food Facts 3) vacío para llenar a mano.
   */
  async consultarEan(codigo: string) {
    const ean = normalizarEan(codigo);
    const local = await this.prisma.producto.findFirst({
      where: { ean: { in: variantesEan(ean) } },
    });
    if (local) {
      return {
        fuente: 'local' as const,
        ean: local.ean ?? ean,
        nombre: local.nombre,
        marca: local.marca,
        imagenUrl: null,
        productoId: local.id,
      };
    }

    const externo = await this.off.buscarPorEan(ean);
    if (externo) {
      const guardado = await this.guardarProductoDesdeOff(externo);
      return {
        fuente: 'openfoodfacts' as const,
        ean: externo.ean,
        nombre: externo.nombre,
        marca: externo.marca,
        imagenUrl: externo.imagenUrl,
        productoId: guardado?.id ?? null,
      };
    }

    return {
      fuente: 'ninguna' as const,
      ean,
      nombre: null,
      marca: null,
      imagenUrl: null,
      productoId: null,
    };
  }

  /**
   * 1) EAN leído en la PWA → catálogo/OFF. 2) Si no, visión. 3) Candidatos
   * del inventario del acopio para no duplicar “Agua Brisa”.
   */
  async interpretarImagen(organizationId: string, id: string, dto: InterpretarImagenDto) {
    const imagen = await this.prisma.donacionImagen.findFirst({
      where: { id, organizationId },
    });
    if (!imagen) {
      throw new NotFoundException('Imagen no encontrada');
    }

    let via: 'ean' | 'vision' | 'manual' = 'manual';
    let nombre: string | null = null;
    let marca: string | null = null;
    let cantidad: number | null = 1;
    let ean: string | null = dto.ean ? normalizarEan(dto.ean) : null;
    let fuenteEan: 'local' | 'openfoodfacts' | 'ninguna' | null = null;

    if (ean) {
      const catalogo = await this.consultarEan(ean);
      fuenteEan = catalogo.fuente;
      ean = catalogo.ean;
      nombre = catalogo.nombre;
      marca = catalogo.marca;
      via = catalogo.nombre ? 'ean' : 'manual';
    } else {
      try {
        const objeto = await this.r2.getObjectBytes(imagen.blobPathname);
        const lectura = await this.vision.leerImagen(objeto.bytes, objeto.contentType);
        if (lectura?.ean) {
          const catalogo = await this.consultarEan(lectura.ean);
          fuenteEan = catalogo.fuente;
          ean = catalogo.ean;
          nombre = catalogo.nombre ?? lectura.nombre;
          marca = catalogo.marca ?? lectura.marca;
          cantidad = lectura.cantidad;
          // Si el modelo sacó un EAN, el camino canónico es catálogo/OFF, no “visión”.
          via = catalogo.nombre ? 'ean' : 'manual';
        } else if (lectura?.nombre) {
          via = 'vision';
          nombre = lectura.nombre;
          marca = lectura.marca;
          cantidad = lectura.cantidad;
        }
      } catch {
        via = 'manual';
      }
    }

    const acopioId = dto.acopioId ?? imagen.acopioId;
    const coincidencias =
      acopioId && nombre
        ? await this.inventario.coincidencias(organizationId, acopioId, nombre, marca)
        : [];

    await this.prisma.donacionImagen.update({
      where: { id },
      data: {
        nombreDetectado: nombre,
        cantidadDetectada: cantidad,
        estado: DonacionImagenEstado.Procesada,
        error: null,
        procesadaEn: new Date(),
      },
    });

    return {
      via,
      fuenteEan,
      ean,
      nombre,
      marca,
      cantidad,
      coincidencias,
    };
  }

  /**
   * Alta sin foto (manual o código de barras). No encola Tesseract.
   */
  async registrarEntrada(organizationId: string, dto: RegistrarEntradaDto) {
    await this.verificarAcopio(organizationId, dto.acopioId);
    const ean = dto.ean ? normalizarEan(dto.ean) : null;
    const item = await this.inventario.aplicarDonacionConfirmada(organizationId, dto.acopioId, {
      nombre: dto.nombre,
      cantidad: dto.cantidad,
      marca: dto.marca,
    });

    if (ean) {
      const ya = await this.prisma.producto.findFirst({
        where: { ean: { in: variantesEan(ean) } },
      });
      if (!ya) {
        await this.prisma.producto.create({
          data: {
            nombre: dto.nombre.trim(),
            marca: dto.marca?.trim() || null,
            ean,
            alias: [],
          },
        }).catch(() => undefined);
      }
    }

    return {
      inventoryItemId: item.id,
      nombre: dto.nombre.trim(),
      cantidad: dto.cantidad,
      ean,
    };
  }

  private async guardarProductoDesdeOff(externo: {
    ean: string;
    nombre: string;
    marca: string | null;
  }) {
    const existente = await this.prisma.producto.findFirst({
      where: { ean: { in: variantesEan(externo.ean) } },
    });
    if (existente) {
      return existente;
    }
    try {
      return await this.prisma.producto.create({
        data: {
          nombre: externo.nombre,
          marca: externo.marca,
          ean: externo.ean,
          alias: [],
        },
      });
    } catch {
      return this.prisma.producto.findFirst({
        where: { ean: { in: variantesEan(externo.ean) } },
      });
    }
  }

  private async conUrlVisible<
    T extends { blobUrl: string; blobPathname: string; cantidadDetectada?: unknown },
  >(imagen: T): Promise<T> {
    return {
      ...imagen,
      blobUrl: await this.r2.urlParaMostrar(imagen.blobPathname, imagen.blobUrl),
      cantidadDetectada:
        imagen.cantidadDetectada == null ? null : Number(imagen.cantidadDetectada),
    };
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

export function normalizarEan(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) {
    throw new BadRequestException('El código de barras debe tener entre 8 y 14 dígitos');
  }
  return digits;
}

export function variantesEan(ean: string): string[] {
  const set = new Set<string>([ean]);
  if (ean.length === 12) {
    set.add(`0${ean}`);
  }
  if (ean.length === 13 && ean.startsWith('0')) {
    set.add(ean.slice(1));
  }
  return [...set];
}
