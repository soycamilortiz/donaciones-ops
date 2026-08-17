import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryCategoria, InventoryUnidad, Prisma } from '@prisma/client';
import { blankToNull } from '../common/soft-delete';
import { PrismaService } from '../prisma/prisma.service';
import { UbicacionesService } from '../ubicaciones/ubicaciones.service';
import type {
  CreateInventoryItemDto,
  InventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { similitudNombres, UMBRAL_MISMO_PRODUCTO } from './nombre-producto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ubicaciones: UbicacionesService,
  ) {}

  /**
   * Tras confirmar una donación: suma cantidad si ya hay un ítem activo con el
   * mismo nombre en el acopio; si no, lo crea.
   */
  async aplicarDonacionConfirmada(
    orgId: string,
    acopioId: string,
    entrada: {
      nombre: string;
      cantidad: number;
      marca?: string | null;
      inventoryItemId?: string | null;
    },
  ): Promise<InventoryItemDto> {
    const acopio = await this.requireAcopio(orgId, acopioId);
    if (!acopio.isActive) {
      throw new BadRequestException('No se puede cargar inventario en un acopio dado de baja');
    }

    if (entrada.inventoryItemId) {
      const pin = await this.requireItem(orgId, acopioId, entrada.inventoryItemId);
      if (!pin.isActive) {
        throw new BadRequestException('Ese ítem de inventario está dado de baja');
      }
      const row = await this.prisma.inventoryItem.update({
        where: { id: pin.id },
        data: { cantidad: { increment: entrada.cantidad } },
      });
      return this.toDto(row);
    }

    const nombre = entrada.nombre.trim();
    const match = await this.mejorCoincidencia(acopioId, nombre, entrada.marca);
    if (match && match.score >= UMBRAL_MISMO_PRODUCTO) {
      const row = await this.prisma.inventoryItem.update({
        where: { id: match.id },
        data: { cantidad: { increment: entrada.cantidad } },
      });
      return this.toDto(row);
    }

    return this.create(orgId, acopioId, {
      nombre,
      cantidad: entrada.cantidad,
      marca: entrada.marca ?? undefined,
      categoria: inferirCategoria(nombre),
      unidad: inferirUnidad(nombre),
    });
  }

  /**
   * Tras validar una recepción: suma stock por (acopio, producto, lote).
   * Solo entra `cantidad_aprobada`.
   */
  async aplicarStockValidado(
    orgId: string,
    acopioId: string,
    entrada: {
      productoId: string;
      loteId?: string | null;
      nombre: string;
      marca?: string | null;
      sku?: string | null;
      categoria: InventoryCategoria;
      unidad: InventoryUnidad;
      cantidad: number;
      vencimiento?: Date | null;
      loteCodigo?: string | null;
      donanteNombre?: string | null;
      donanteContacto?: string | null;
      usuarioId: string;
    },
  ): Promise<InventoryItemDto> {
    const acopio = await this.requireAcopio(orgId, acopioId);
    if (!acopio.isActive) {
      throw new BadRequestException('No se puede cargar inventario en un acopio dado de baja');
    }

    const existente = await this.prisma.inventoryItem.findFirst({
      where: {
        acopioId,
        isActive: true,
        productoId: entrada.productoId,
        loteId: entrada.loteId ? entrada.loteId : { equals: null },
      },
    });
    const row = existente
      ? await this.prisma.inventoryItem.update({
          where: { id: existente.id },
          data: { cantidad: { increment: entrada.cantidad } },
        })
      : await this.prisma.inventoryItem.create({
          data: {
            acopioId,
            productoId: entrada.productoId,
            loteId: entrada.loteId ?? null,
            nombre: entrada.nombre.trim(),
            categoria: entrada.categoria,
            sku: entrada.sku ?? null,
            marca: entrada.marca ?? null,
            cantidad: new Prisma.Decimal(entrada.cantidad),
            unidad: entrada.unidad,
            vencimiento: entrada.vencimiento ?? undefined,
            loteCodigo: entrada.loteCodigo ?? null,
            donanteNombre: entrada.donanteNombre ?? null,
            donanteContacto: entrada.donanteContacto ?? null,
            isActive: true,
          },
        });

    await this.ubicaciones.depositarEnMuelle({
      organizationId: orgId,
      acopioId,
      inventoryItemId: row.id,
      cantidad: entrada.cantidad,
      usuarioId: entrada.usuarioId,
    });

    return this.toDto(row);
  }

  async coincidencias(
    orgId: string,
    acopioId: string,
    nombre: string,
    marca?: string | null,
  ): Promise<
    Array<{ id: string; nombre: string; marca: string | null; cantidad: number; score: number }>
  > {
    await this.requireAcopio(orgId, acopioId);
    const filas = await this.prisma.inventoryItem.findMany({
      where: { acopioId, isActive: true },
      select: { id: true, nombre: true, marca: true, cantidad: true },
    });
    return filas
      .map((row) => ({
        id: row.id,
        nombre: row.nombre,
        marca: row.marca,
        cantidad: Number(row.cantidad),
        score: scoreFila(nombre, marca, row.nombre, row.marca),
      }))
      .filter((row) => row.score >= 0.55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private async mejorCoincidencia(acopioId: string, nombre: string, marca?: string | null) {
    const filas = await this.prisma.inventoryItem.findMany({
      where: { acopioId, isActive: true },
      select: { id: true, nombre: true, marca: true },
    });
    let best: { id: string; score: number } | null = null;
    for (const row of filas) {
      const score = scoreFila(nombre, marca, row.nombre, row.marca);
      if (!best || score > best.score) {
        best = { id: row.id, score };
      }
    }
    return best;
  }

  async list(orgId: string, acopioId: string) {
    await this.requireAcopio(orgId, acopioId);
    const rows = await this.prisma.inventoryItem.findMany({
      where: { acopioId },
      include: {
        balances: { where: { isActive: true }, include: { ubicacion: true } },
      },
      orderBy: [{ isActive: 'desc' }, { categoria: 'asc' }, { nombre: 'asc' }],
    });
    return rows.map((row) => this.ubicaciones.toInventoryDto(row));
  }

  async create(
    orgId: string,
    acopioId: string,
    dto: CreateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    const acopio = await this.requireAcopio(orgId, acopioId);
    if (!acopio.isActive) {
      throw new BadRequestException('No se puede cargar inventario en un acopio dado de baja');
    }
    const row = await this.prisma.inventoryItem.create({
      data: {
        acopioId,
        nombre: dto.nombre.trim(),
        categoria: dto.categoria,
        categoriaDetalle: blankToNull(dto.categoriaDetalle),
        sku: blankToNull(dto.sku),
        marca: blankToNull(dto.marca),
        presentacion: blankToNull(dto.presentacion),
        talla: blankToNull(dto.talla),
        destinatario: dto.destinatario,
        cantidad: new Prisma.Decimal(dto.cantidad),
        unidad: dto.unidad,
        unidadDetalle: blankToNull(dto.unidadDetalle),
        vencimiento: dto.vencimiento ? new Date(dto.vencimiento) : undefined,
        estado: dto.estado,
        loteCodigo: blankToNull(dto.loteCodigo),
        ubicacionInterna: blankToNull(dto.ubicacionInterna),
        donanteNombre: blankToNull(dto.donanteNombre),
        donanteContacto: blankToNull(dto.donanteContacto),
        observaciones: blankToNull(dto.observaciones),
        isActive: true,
      },
    });
    return this.toDto(row);
  }

  async update(
    orgId: string,
    acopioId: string,
    itemId: string,
    dto: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    await this.requireItem(orgId, acopioId, itemId);
    const row = await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: this.toUpdate(dto),
    });
    return this.toDto(row);
  }

  async remove(orgId: string, acopioId: string, itemId: string): Promise<void> {
    await this.requireItem(orgId, acopioId, itemId);
    await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { isActive: false },
    });
  }

  private async requireAcopio(orgId: string, acopioId: string) {
    const acopio = await this.prisma.acopio.findFirst({
      where: { id: acopioId, organizationId: orgId },
    });
    if (!acopio) {
      throw new NotFoundException('Acopio no encontrado');
    }
    return acopio;
  }

  private async requireItem(orgId: string, acopioId: string, itemId: string) {
    await this.requireAcopio(orgId, acopioId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, acopioId },
    });
    if (!item) {
      throw new NotFoundException('Ítem de inventario no encontrado');
    }
    return item;
  }

  private toUpdate(dto: UpdateInventoryItemDto): Prisma.InventoryItemUpdateInput {
    const { cantidad, vencimiento, isActive, ...rest } = dto;
    return {
      ...rest,
      ...(cantidad === undefined ? {} : { cantidad: new Prisma.Decimal(cantidad) }),
      ...(vencimiento === undefined
        ? {}
        : { vencimiento: vencimiento ? new Date(vencimiento) : null }),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    };
  }

  private toDto(row: {
    id: string;
    acopioId: string;
    nombre: string;
    categoria: InventoryItemDto['categoria'];
    categoriaDetalle: string | null;
    sku: string | null;
    marca: string | null;
    presentacion: string | null;
    talla: string | null;
    destinatario: InventoryItemDto['destinatario'];
    cantidad: Prisma.Decimal;
    unidad: InventoryItemDto['unidad'];
    unidadDetalle: string | null;
    vencimiento: Date | null;
    estado: InventoryItemDto['estado'];
    loteCodigo: string | null;
    ubicacionInterna: string | null;
    donanteNombre: string | null;
    donanteContacto: string | null;
    observaciones: string | null;
    isActive: boolean;
  }): InventoryItemDto {
    return {
      ...row,
      cantidad: Number(row.cantidad),
      isActive: row.isActive === true,
    };
  }
}

function inferirCategoria(nombre: string): InventoryCategoria {
  const n = nombre.toLowerCase();
  if (/\bagua|brisa|cristal|botella/.test(n)) return InventoryCategoria.AGUA;
  if (/\barroz|atún|atun|aceite|lenteja|frijol|harina|azucar|azúcar/.test(n)) {
    return InventoryCategoria.ALIMENTOS_NO_PERECEDEROS;
  }
  if (/\bpañal|panal|bebe|bebé/.test(n)) return InventoryCategoria.PANALES_BEBE;
  if (/\bjabón|jabon|shampoo|higiene|crema|colgate/.test(n)) return InventoryCategoria.ASEO_HIGIENE;
  return InventoryCategoria.OTRO;
}

function inferirUnidad(nombre: string): InventoryUnidad {
  const n = nombre.toLowerCase();
  if (/\bbotella/.test(n)) return InventoryUnidad.BOTELLA;
  if (/\bpack|paquete|x\d/.test(n)) return InventoryUnidad.PAQUETE;
  if (/\blitro|\bl\b/.test(n)) return InventoryUnidad.LITRO;
  return InventoryUnidad.UNIDAD;
}

function scoreFila(
  nombre: string,
  marca: string | null | undefined,
  nombreFila: string,
  marcaFila: string | null,
): number {
  let score = similitudNombres(nombre, nombreFila);
  if (marca && marcaFila && similitudNombres(marca, marcaFila) >= 0.85) {
    score = Math.min(1, score + 0.08);
  }
  return score;
}
