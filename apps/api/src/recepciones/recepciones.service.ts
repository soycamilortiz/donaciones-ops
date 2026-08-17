import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DonacionImagenEstado,
  InventoryUnidad,
  type Lote,
  Prisma,
  type Producto,
  type Recepcion,
  RecepcionEstado,
  type RecepcionItem,
  RecepcionItemEstado,
  RecepcionPresentacion,
  RecepcionTipo,
  type UnidadLogistica,
  UnidadLogisticaTipo,
} from '@prisma/client';
import type { Recepcion as RecepcionDto } from '@soschoco/shared';
import { CatalogoService } from '../catalogo/catalogo.service';
import { blankToNull } from '../common/soft-delete';
import { InventoryService } from '../inventory/inventory.service';
import { OrgCountersService } from '../org-counters/org-counters.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CrearRecepcionItemDto,
  CreateRecepcionDto,
  GenerarUnidadesDto,
  InspeccionarItemDto,
} from './dto/recepcion.dto';

const UL_PREFIX: Record<UnidadLogisticaTipo, string> = {
  PALLET: 'PAL',
  CAJA: 'CAJ',
  BULTO: 'BUL',
  SACO: 'SAC',
  CONTENEDOR: 'CON',
  CANECA: 'CAN',
  BOLSA: 'BOL',
  PAQUETE: 'PAQ',
  OTRO: 'ULO',
};

const ABIERTA: RecepcionEstado[] = [
  RecepcionEstado.BORRADOR,
  RecepcionEstado.EN_RECEPCION,
  RecepcionEstado.EN_INSPECCION,
  RecepcionEstado.PENDIENTE_VALIDACION,
];

const INCLUDE = {
  acopio: { select: { id: true, nombre: true } },
  unidades: { where: { isActive: true }, orderBy: { nroEnRecepcion: 'asc' as const } },
  items: {
    where: { isActive: true },
    orderBy: { createdAt: 'asc' as const },
    include: {
      producto: true,
      lote: true,
      unidadLogistica: {
        select: { id: true, codigo: true, nroEnRecepcion: true, tipo: true },
      },
    },
  },
} satisfies Prisma.RecepcionInclude;

type RecepcionCargada = Prisma.RecepcionGetPayload<{ include: typeof INCLUDE }>;

export type ConfirmarFotoDto = {
  nombre: string;
  cantidad: number;
  acopioId?: string;
  marca?: string | null;
  recepcionId?: string;
  unidadLogisticaId?: string;
  productoId?: string;
  crearProducto?: boolean;
  ean?: string;
  presentacion?: string;
  loteCodigoOrigen?: string;
  vencimiento?: string;
};

@Injectable()
export class RecepcionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: OrgCountersService,
    private readonly catalogo: CatalogoService,
    private readonly inventario: InventoryService,
  ) {}

  async list(orgId: string): Promise<RecepcionDto[]> {
    const rows = await this.prisma.recepcion.findMany({
      where: { organizationId: orgId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.toDto(row));
  }

  async get(orgId: string, id: string): Promise<RecepcionDto> {
    return this.toDto(await this.requireRecepcion(orgId, id));
  }

  async create(orgId: string, userId: string, dto: CreateRecepcionDto): Promise<RecepcionDto> {
    await this.requireAcopio(orgId, dto.acopioId);
    const codigo = await this.counters.codigoRecepcion(orgId);
    const row = await this.prisma.recepcion.create({
      data: {
        codigo,
        organizationId: orgId,
        acopioId: dto.acopioId,
        tipo: dto.tipo,
        presentacionFisica: dto.presentacionFisica,
        estado: RecepcionEstado.EN_RECEPCION,
        donanteNombre: blankToNull(dto.donanteNombre),
        donanteContacto: blankToNull(dto.donanteContacto),
        procedencia: blankToNull(dto.procedencia),
        transportista: blankToNull(dto.transportista),
        vehiculoPlaca: blankToNull(dto.vehiculoPlaca),
        documentoTransporte: blankToNull(dto.documentoTransporte),
        observaciones: blankToNull(dto.observaciones),
        responsableId: userId,
        isActive: true,
      },
    });

    if (dto.cantidadUnidades && dto.cantidadUnidades > 0) {
      const tipo = dto.tipoUnidad ?? tipoUnidadPorPresentacion(dto.presentacionFisica);
      await this.generarUnidadesEn(row, tipo, dto.cantidadUnidades);
    }

    return this.get(orgId, row.id);
  }

  async generarUnidades(orgId: string, id: string, dto: GenerarUnidadesDto): Promise<RecepcionDto> {
    const recepcion = await this.requireRecepcion(orgId, id);
    this.assertAbierta(recepcion);
    await this.generarUnidadesEn(recepcion, dto.tipo, dto.cantidad);
    return this.get(orgId, id);
  }

  async agregarItem(orgId: string, id: string, dto: CrearRecepcionItemDto): Promise<RecepcionDto> {
    const recepcion = await this.requireRecepcion(orgId, id);
    this.assertAbierta(recepcion);
    await this.crearLinea(recepcion, {
      nombre: dto.nombre,
      cantidad: dto.cantidad,
      marca: dto.marca,
      productoId: dto.productoId,
      unidadLogisticaId: dto.unidadLogisticaId,
      presentacion: dto.presentacion,
      unidad: dto.unidad,
      loteCodigoOrigen: dto.loteCodigoOrigen,
      vencimiento: dto.vencimiento,
      observaciones: dto.observaciones,
    });
    return this.get(orgId, id);
  }

  async inspeccionarItem(
    orgId: string,
    id: string,
    itemId: string,
    dto: InspeccionarItemDto,
  ): Promise<RecepcionDto> {
    const recepcion = await this.requireRecepcion(orgId, id);
    this.assertAbierta(recepcion);
    const item = recepcion.items.find((row) => row.id === itemId);
    if (!item) {
      throw new NotFoundException('Línea de recepción no encontrada');
    }
    const recibida = Number(item.cantidadRecibida);
    const suma = dto.cantidadAprobada + dto.cantidadCuarentena + dto.cantidadRechazada;
    if (Math.abs(suma - recibida) > 0.001) {
      throw new BadRequestException(
        'Lo aprobado, en cuarentena y rechazado tiene que sumar lo recibido',
      );
    }

    await this.prisma.recepcionItem.update({
      where: { id: itemId },
      data: {
        cantidadAprobada: new Prisma.Decimal(dto.cantidadAprobada),
        cantidadCuarentena: new Prisma.Decimal(dto.cantidadCuarentena),
        cantidadRechazada: new Prisma.Decimal(dto.cantidadRechazada),
        observaciones: blankToNull(dto.observaciones) ?? item.observaciones,
        estadoLinea: RecepcionItemEstado.INSPECCIONADA,
      },
    });

    if (recepcion.estado === RecepcionEstado.EN_RECEPCION) {
      await this.prisma.recepcion.update({
        where: { id },
        data: { estado: RecepcionEstado.EN_INSPECCION },
      });
    }

    return this.get(orgId, id);
  }

  async validar(orgId: string, id: string): Promise<RecepcionDto> {
    const recepcion = await this.requireRecepcion(orgId, id);
    this.assertAbierta(recepcion);
    if (recepcion.items.length === 0) {
      throw new BadRequestException('No hay líneas para validar');
    }

    for (const item of recepcion.items) {
      if (!item.productoId || !item.producto) {
        throw new BadRequestException('Hay líneas sin producto identificado');
      }

      let aprobada = Number(item.cantidadAprobada);
      let cuarentena = Number(item.cantidadCuarentena);
      let rechazada = Number(item.cantidadRechazada);
      const recibida = Number(item.cantidadRecibida);

      if (item.estadoLinea === RecepcionItemEstado.IDENTIFICADA) {
        aprobada = recibida;
        cuarentena = 0;
        rechazada = 0;
      } else if (item.estadoLinea !== RecepcionItemEstado.INSPECCIONADA) {
        throw new BadRequestException('Hay líneas que todavía no se pueden validar');
      }

      const faltanDatos = this.faltanDatosObligatorios(item.producto, item.lote);
      if (faltanDatos && aprobada > 0) {
        cuarentena += aprobada;
        aprobada = 0;
      }

      let inventoryItemId: string | null = item.inventoryItemId;
      if (aprobada > 0) {
        const stock = await this.inventario.aplicarStockValidado(orgId, recepcion.acopioId, {
          productoId: item.producto.id,
          loteId: item.loteId,
          nombre: item.producto.nombre,
          marca: item.producto.marca,
          sku: item.producto.sku,
          categoria: item.producto.categoriaInventario,
          unidad: item.unidad,
          cantidad: aprobada,
          vencimiento: item.lote?.vencimiento ?? null,
          loteCodigo: item.lote?.codigoOrigen ?? item.lote?.codigo ?? null,
          donanteNombre: recepcion.donanteNombre,
          donanteContacto: recepcion.donanteContacto,
        });
        inventoryItemId = stock.id;
      }

      await this.prisma.recepcionItem.update({
        where: { id: item.id },
        data: {
          cantidadAprobada: new Prisma.Decimal(aprobada),
          cantidadCuarentena: new Prisma.Decimal(cuarentena),
          cantidadRechazada: new Prisma.Decimal(rechazada),
          inventoryItemId,
          estadoLinea: RecepcionItemEstado.VALIDADA,
        },
      });
    }

    await this.prisma.recepcion.update({
      where: { id },
      data: { estado: RecepcionEstado.VALIDADA, validadaEn: new Date() },
    });

    return this.get(orgId, id);
  }

  async anular(orgId: string, id: string): Promise<RecepcionDto> {
    const recepcion = await this.requireRecepcion(orgId, id);
    if (recepcion.estado === RecepcionEstado.VALIDADA) {
      throw new BadRequestException('Una recepción validada no se anula (el stock ya está)');
    }
    await this.prisma.recepcion.update({
      where: { id },
      data: { estado: RecepcionEstado.ANULADA, isActive: false },
    });
    return this.get(orgId, id);
  }

  /**
   * Confirmar una foto: identifica el producto y abre/usa una recepción.
   * No toca inventario.
   */
  async confirmarFoto(
    orgId: string,
    imagenId: string,
    userId: string,
    dto: ConfirmarFotoDto,
  ): Promise<{ recepcionId: string; itemId: string }> {
    const imagen = await this.prisma.donacionImagen.findFirst({
      where: { id: imagenId, organizationId: orgId },
    });
    if (!imagen) {
      throw new NotFoundException('Imagen no encontrada');
    }
    if (imagen.confirmadaEn) {
      throw new ConflictException('Esta foto ya está en una recepción');
    }

    const acopioId = dto.acopioId ?? imagen.acopioId;
    if (!acopioId) {
      throw new BadRequestException('Elegí el acopio donde entra esta donación');
    }
    await this.requireAcopio(orgId, acopioId);

    const recepcion = dto.recepcionId
      ? await this.requireRecepcion(orgId, dto.recepcionId)
      : await this.abrirIndividual(orgId, userId, acopioId);

    if (recepcion.acopioId !== acopioId) {
      throw new BadRequestException('El acopio de la foto no coincide con la recepción');
    }
    this.assertAbierta(recepcion);

    const linea = await this.crearLinea(recepcion, {
      nombre: dto.nombre,
      cantidad: dto.cantidad,
      marca: dto.marca,
      productoId: dto.productoId,
      crearProducto: dto.crearProducto,
      ean: dto.ean,
      unidadLogisticaId: dto.unidadLogisticaId,
      presentacion: dto.presentacion,
      loteCodigoOrigen: dto.loteCodigoOrigen,
      vencimiento: dto.vencimiento,
    });

    await this.prisma.donacionImagen.update({
      where: { id: imagenId },
      data: {
        acopioId,
        nombreDetectado: dto.nombre.trim(),
        cantidadDetectada: dto.cantidad,
        confirmadaEn: new Date(),
        productoId: linea.productoId,
        recepcionItemId: linea.id,
        estado: DonacionImagenEstado.PROCESADA,
        error: null,
      },
    });

    return { recepcionId: recepcion.id, itemId: linea.id };
  }

  private async abrirIndividual(
    orgId: string,
    userId: string,
    acopioId: string,
  ): Promise<RecepcionCargada> {
    const abierta = await this.prisma.recepcion.findFirst({
      where: {
        organizationId: orgId,
        acopioId,
        tipo: RecepcionTipo.DONACION_INDIVIDUAL,
        estado: { in: ABIERTA },
        isActive: true,
      },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    if (abierta) {
      return abierta;
    }
    const created = await this.create(orgId, userId, {
      acopioId,
      tipo: RecepcionTipo.DONACION_INDIVIDUAL,
      presentacionFisica: RecepcionPresentacion.SUELTA,
    });
    return this.requireRecepcion(orgId, created.id);
  }

  private async crearLinea(
    recepcion: RecepcionCargada,
    entrada: {
      nombre: string;
      cantidad: number;
      marca?: string | null;
      productoId?: string;
      crearProducto?: boolean;
      ean?: string;
      unidadLogisticaId?: string;
      presentacion?: string;
      unidad?: InventoryUnidad;
      loteCodigoOrigen?: string;
      vencimiento?: string;
      observaciones?: string;
    },
  ): Promise<RecepcionItem> {
    if (entrada.unidadLogisticaId) {
      const ul = recepcion.unidades.find((u) => u.id === entrada.unidadLogisticaId);
      if (!ul) {
        throw new BadRequestException('Esa unidad logística no es de esta recepción');
      }
    }

    const producto = await this.resolverProducto(entrada);
    const lote = await this.ensureLote(recepcion.organizationId, producto, {
      codigoOrigen: entrada.loteCodigoOrigen,
      vencimiento: entrada.vencimiento,
    });

    return this.prisma.recepcionItem.create({
      data: {
        recepcionId: recepcion.id,
        unidadLogisticaId: entrada.unidadLogisticaId ?? null,
        productoId: producto.id,
        loteId: lote?.id ?? null,
        cantidadRecibida: new Prisma.Decimal(entrada.cantidad),
        unidad: entrada.unidad ?? producto.unidadBase,
        estadoLinea: RecepcionItemEstado.IDENTIFICADA,
        observaciones: blankToNull(entrada.observaciones),
        isActive: true,
      },
    });
  }

  private async resolverProducto(entrada: {
    nombre: string;
    marca?: string | null;
    productoId?: string;
    crearProducto?: boolean;
    ean?: string;
    presentacion?: string;
  }): Promise<Producto> {
    if (entrada.productoId) {
      const row = await this.prisma.producto.findFirst({
        where: { id: entrada.productoId, isActive: true },
      });
      if (!row) {
        throw new NotFoundException('Producto no encontrado');
      }
      return row;
    }

    if (entrada.ean) {
      const porEan = await this.prisma.producto.findFirst({
        where: { ean: entrada.ean, isActive: true },
      });
      if (porEan) {
        return porEan;
      }
    }

    const porNombre = await this.catalogo.resolverPorNombre(entrada.nombre, entrada.marca);
    if (porNombre && !entrada.crearProducto) {
      return porNombre;
    }

    return this.catalogo.crear({
      nombre: entrada.nombre,
      marca: entrada.marca,
      ean: entrada.ean,
      presentacion: entrada.presentacion,
    });
  }

  private async ensureLote(
    organizationId: string,
    producto: Producto,
    opts: { codigoOrigen?: string; vencimiento?: string },
  ): Promise<Lote | null> {
    const codigoOrigen = blankToNull(opts.codigoOrigen);
    const vencimiento = opts.vencimiento ? new Date(opts.vencimiento) : null;
    const haceFalta =
      Boolean(codigoOrigen) ||
      Boolean(vencimiento) ||
      producto.requiereLote ||
      producto.requiereVencimiento;
    if (!haceFalta) {
      return null;
    }

    if (codigoOrigen) {
      const existente = await this.prisma.lote.findFirst({
        where: {
          organizationId,
          productoId: producto.id,
          codigoOrigen,
          isActive: true,
        },
      });
      if (existente) {
        if (vencimiento && !existente.vencimiento) {
          return this.prisma.lote.update({
            where: { id: existente.id },
            data: { vencimiento },
          });
        }
        return existente;
      }
    }

    const codigo = await this.counters.codigoLote(organizationId);
    return this.prisma.lote.create({
      data: {
        codigo,
        codigoOrigen,
        productoId: producto.id,
        organizationId,
        vencimiento,
        isActive: true,
      },
    });
  }

  private async generarUnidadesEn(
    recepcion: Pick<Recepcion, 'id' | 'organizationId'> & { unidades?: UnidadLogistica[] },
    tipo: UnidadLogisticaTipo,
    cantidad: number,
  ): Promise<void> {
    const actuales = recepcion.unidades
      ? recepcion.unidades.length
      : await this.prisma.unidadLogistica.count({
          where: { recepcionId: recepcion.id, isActive: true },
        });
    const prefix = UL_PREFIX[tipo];
    for (let i = 1; i <= cantidad; i += 1) {
      const codigo = await this.counters.codigoUnidad(recepcion.organizationId, prefix);
      await this.prisma.unidadLogistica.create({
        data: {
          codigo,
          nroEnRecepcion: actuales + i,
          recepcionId: recepcion.id,
          tipo,
          isActive: true,
        },
      });
    }
  }

  private faltanDatosObligatorios(producto: Producto, lote: Lote | null): boolean {
    if (producto.requiereVencimiento && !lote?.vencimiento) {
      return true;
    }
    if (producto.requiereLote && !lote?.codigoOrigen) {
      return true;
    }
    return false;
  }

  private assertAbierta(recepcion: Pick<Recepcion, 'estado'>): void {
    if (!ABIERTA.includes(recepcion.estado)) {
      throw new BadRequestException('Esta recepción ya no admite cambios');
    }
  }

  private async requireAcopio(orgId: string, acopioId: string) {
    const acopio = await this.prisma.acopio.findFirst({
      where: { id: acopioId, organizationId: orgId },
    });
    if (!acopio) {
      throw new NotFoundException('Acopio no encontrado');
    }
    if (!acopio.isActive) {
      throw new BadRequestException('No se puede recibir en un acopio dado de baja');
    }
    return acopio;
  }

  private async requireRecepcion(orgId: string, id: string): Promise<RecepcionCargada> {
    const row = await this.prisma.recepcion.findFirst({
      where: { id, organizationId: orgId },
      include: INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Recepción no encontrada');
    }
    return row;
  }

  private toDto(row: RecepcionCargada): RecepcionDto {
    return {
      id: row.id,
      codigo: row.codigo,
      organizationId: row.organizationId,
      acopioId: row.acopioId,
      acopioNombre: row.acopio.nombre,
      tipo: row.tipo,
      presentacionFisica: row.presentacionFisica,
      estado: row.estado,
      recibidaEn: row.recibidaEn.toISOString(),
      donanteNombre: row.donanteNombre,
      donanteContacto: row.donanteContacto,
      procedencia: row.procedencia,
      transportista: row.transportista,
      vehiculoPlaca: row.vehiculoPlaca,
      documentoTransporte: row.documentoTransporte,
      observaciones: row.observaciones,
      responsableId: row.responsableId,
      validadaEn: row.validadaEn?.toISOString() ?? null,
      isActive: row.isActive,
      unidades: row.unidades.map((ul) => ({
        id: ul.id,
        codigo: ul.codigo,
        nroEnRecepcion: ul.nroEnRecepcion,
        tipo: ul.tipo,
        estado: ul.estado,
        observaciones: ul.observaciones,
      })),
      items: row.items.map((item) => ({
        id: item.id,
        unidadLogisticaId: item.unidadLogisticaId,
        productoId: item.productoId,
        loteId: item.loteId,
        inventoryItemId: item.inventoryItemId,
        cantidadRecibida: Number(item.cantidadRecibida),
        cantidadAprobada: Number(item.cantidadAprobada),
        cantidadCuarentena: Number(item.cantidadCuarentena),
        cantidadRechazada: Number(item.cantidadRechazada),
        unidad: item.unidad,
        pesoKg: item.pesoKg == null ? null : Number(item.pesoKg),
        estadoLinea: item.estadoLinea,
        observaciones: item.observaciones,
        producto: item.producto
          ? {
              id: item.producto.id,
              sku: item.producto.sku,
              nombre: item.producto.nombre,
              marca: item.producto.marca,
              categoria: item.producto.categoria,
              categoriaInventario: item.producto.categoriaInventario,
              ean: item.producto.ean,
              alias: item.producto.alias,
              unidadBase: item.producto.unidadBase,
              presentacion: item.producto.presentacion,
              requiereLote: item.producto.requiereLote,
              requiereVencimiento: item.producto.requiereVencimiento,
              esPerecedero: item.producto.esPerecedero,
              isActive: item.producto.isActive,
            }
          : null,
        lote: item.lote
          ? {
              id: item.lote.id,
              codigo: item.lote.codigo,
              codigoOrigen: item.lote.codigoOrigen,
              vencimiento: item.lote.vencimiento?.toISOString() ?? null,
            }
          : null,
        unidadLogistica: item.unidadLogistica,
      })),
    };
  }
}

function tipoUnidadPorPresentacion(presentacion: RecepcionPresentacion): UnidadLogisticaTipo {
  switch (presentacion) {
    case RecepcionPresentacion.PALLETS:
      return UnidadLogisticaTipo.PALLET;
    case RecepcionPresentacion.CAJAS:
      return UnidadLogisticaTipo.CAJA;
    case RecepcionPresentacion.BULTOS:
      return UnidadLogisticaTipo.BULTO;
    case RecepcionPresentacion.CONTENEDORES:
      return UnidadLogisticaTipo.CONTENEDOR;
    default:
      return UnidadLogisticaTipo.PALLET;
  }
}
