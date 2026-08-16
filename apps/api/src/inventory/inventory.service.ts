import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryCategoria, InventoryUnidad, Prisma } from '@prisma/client';
import { blankToNull } from '../common/soft-delete';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateInventoryItemDto,
  InventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tras confirmar una donación: suma cantidad si ya hay un ítem activo con el
   * mismo nombre en el acopio; si no, lo crea.
   */
  async aplicarDonacionConfirmada(
    orgId: string,
    acopioId: string,
    entrada: { nombre: string; cantidad: number; marca?: string | null },
  ): Promise<InventoryItemDto> {
    const acopio = await this.requireAcopio(orgId, acopioId);
    if (!acopio.isActive) {
      throw new BadRequestException('No se puede cargar inventario en un acopio dado de baja');
    }

    const nombre = entrada.nombre.trim();
    const existente = await this.prisma.inventoryItem.findFirst({
      where: {
        acopioId,
        isActive: true,
        nombre: { equals: nombre, mode: 'insensitive' },
      },
    });

    if (existente) {
      const row = await this.prisma.inventoryItem.update({
        where: { id: existente.id },
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

  async list(orgId: string, acopioId: string): Promise<InventoryItemDto[]> {
    await this.requireAcopio(orgId, acopioId);
    const rows = await this.prisma.inventoryItem.findMany({
      where: { acopioId },
      orderBy: [{ isActive: 'desc' }, { categoria: 'asc' }, { nombre: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
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
