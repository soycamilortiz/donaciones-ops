import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
