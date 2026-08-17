import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DemandaEstado,
  DemandaItemTipo,
  InventoryEstado,
  Prisma,
  ReservaEstado,
  UbicacionEstado,
  UbicacionFuncion,
} from '@prisma/client';
import { blankToNull } from '../common/soft-delete';
import { OrgCountersService } from '../org-counters/org-counters.service';
import { PrismaService } from '../prisma/prisma.service';
import { asignarCantidad, type CandidatoSaldo, maxKits, repartirKitsEscasos } from './asignacion';
import type {
  CrearDemandaDto,
  CrearKitDto,
  CrearReservaDto,
  DemandaDto,
  KitDto,
  PlanEscasoDto,
  ReservaDto,
  SimulacionReservaDto,
  UpdateKitDto,
} from './dto/reserva.dto';

const FUNCIONES_RESERVA = new Set<string>([
  UbicacionFuncion.ALMACENAMIENTO,
  UbicacionFuncion.PICKING,
]);

@Injectable()
export class ReservasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: OrgCountersService,
  ) {}

  async listKits(orgId: string): Promise<KitDto[]> {
    const rows = await this.prisma.kit.findMany({
      where: { organizationId: orgId, isActive: true },
      include: KIT_INCLUDE,
      orderBy: { codigo: 'asc' },
    });
    return rows.map((row) => this.toKitDto(row));
  }

  async listCatalogoProductos() {
    return this.prisma.producto.findMany({
      where: { isActive: true },
      select: { id: true, nombre: true, sku: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async createKit(orgId: string, dto: CrearKitDto): Promise<KitDto> {
    const codigo = dto.codigo?.trim().toUpperCase() || (await this.counters.codigoKit(orgId));
    if (dto.componentes) {
      await this.requireProductos(dto.componentes.map((c) => c.productoId));
    }
    try {
      const row = await this.prisma.kit.create({
        data: {
          organizationId: orgId,
          codigo,
          nombre: dto.nombre.trim(),
          descripcion: blankToNull(dto.descripcion ?? ''),
          isActive: true,
          componentes: dto.componentes?.length
            ? {
                create: dto.componentes.map((comp) => ({
                  productoId: comp.productoId,
                  cantidad: new Prisma.Decimal(comp.cantidad),
                  isActive: true,
                })),
              }
            : undefined,
        },
        include: KIT_INCLUDE,
      });
      return this.toKitDto(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Ya hay un kit con ese código');
      }
      throw err;
    }
  }

  async updateKit(orgId: string, id: string, dto: UpdateKitDto): Promise<KitDto> {
    await this.requireKit(orgId, id);
    const row = await this.prisma.kit.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        descripcion: dto.descripcion === undefined ? undefined : blankToNull(dto.descripcion),
      },
      include: KIT_INCLUDE,
    });
    return this.toKitDto(row);
  }

  async addComponente(
    orgId: string,
    kitId: string,
    productoId: string,
    cantidad: number,
  ): Promise<KitDto> {
    await this.requireKit(orgId, kitId);
    await this.requireProductos([productoId]);
    try {
      await this.prisma.kitComponente.upsert({
        where: { kitId_productoId: { kitId, productoId } },
        create: {
          kitId,
          productoId,
          cantidad: new Prisma.Decimal(cantidad),
          isActive: true,
        },
        update: { cantidad: new Prisma.Decimal(cantidad), isActive: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Ese producto ya está en el kit');
      }
      throw err;
    }
    return this.getKit(orgId, kitId);
  }

  async removeComponente(orgId: string, kitId: string, componenteId: string): Promise<KitDto> {
    await this.requireKit(orgId, kitId);
    const row = await this.prisma.kitComponente.findFirst({
      where: { id: componenteId, kitId },
    });
    if (!row) {
      throw new NotFoundException('Componente no encontrado');
    }
    await this.prisma.kitComponente.update({
      where: { id: componenteId },
      data: { isActive: false },
    });
    return this.getKit(orgId, kitId);
  }

  async removeKit(orgId: string, id: string): Promise<void> {
    await this.requireKit(orgId, id);
    await this.prisma.kit.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getKit(orgId: string, id: string): Promise<KitDto> {
    const row = await this.requireKit(orgId, id);
    return this.toKitDto(row);
  }

  async listDemandas(orgId: string): Promise<DemandaDto[]> {
    const rows = await this.prisma.demanda.findMany({
      where: { organizationId: orgId, isActive: true },
      include: DEMANDA_INCLUDE,
      orderBy: [{ prioridad: 'asc' }, { createdAt: 'desc' }],
    });
    const dtos: DemandaDto[] = [];
    for (const row of rows) {
      dtos.push(await this.toDemandaDto(row));
    }
    return dtos;
  }

  async getDemanda(orgId: string, id: string): Promise<DemandaDto> {
    const row = await this.requireDemanda(orgId, id);
    const dto = await this.toDemandaDto(row);
    for (const item of dto.items) {
      const prismaItem = row.items.find((rowItem) => rowItem.id === item.id);
      const pendiente = Math.max(0, item.cantidadSolicitada - item.cantidadCubierta);
      if (!prismaItem || pendiente <= 0) {
        item.cantidadPosible = 0;
        continue;
      }
      try {
        const sim = await this.simular(row.acopioId, prismaItem, pendiente);
        item.cantidadPosible = sim.posible;
      } catch {
        item.cantidadPosible = 0;
      }
    }
    return dto;
  }

  async createDemanda(orgId: string, usuarioId: string, dto: CrearDemandaDto): Promise<DemandaDto> {
    const acopio = await this.prisma.acopio.findFirst({
      where: { id: dto.acopioId, organizationId: orgId },
    });
    if (!acopio) {
      throw new NotFoundException('Acopio no encontrado');
    }
    for (const item of dto.items) {
      if (item.tipo === DemandaItemTipo.KIT) {
        if (!item.kitId) {
          throw new BadRequestException('Una línea de kit necesita kitId');
        }
        await this.requireKit(orgId, item.kitId);
      } else {
        if (!item.productoId) {
          throw new BadRequestException('Una línea de producto necesita productoId');
        }
        await this.requireProductos([item.productoId]);
      }
    }
    const codigo = await this.counters.codigoDemanda(orgId);
    const row = await this.prisma.demanda.create({
      data: {
        codigo,
        organizationId: orgId,
        acopioId: dto.acopioId,
        destinoNombre: dto.destinoNombre.trim(),
        destinoMunicipio: blankToNull(dto.destinoMunicipio ?? ''),
        destinoDepartamento: blankToNull(dto.destinoDepartamento ?? ''),
        prioridad: dto.prioridad ?? 'MEDIA',
        estado: DemandaEstado.ABIERTA,
        fechaRequerida: dto.fechaRequerida ? new Date(dto.fechaRequerida) : null,
        poblacionAfectada: dto.poblacionAfectada ?? null,
        tipoEmergencia: blankToNull(dto.tipoEmergencia ?? ''),
        observaciones: blankToNull(dto.observaciones ?? ''),
        createdById: usuarioId,
        isActive: true,
        items: {
          create: dto.items.map((item) => ({
            tipo: item.tipo,
            kitId: item.tipo === DemandaItemTipo.KIT ? item.kitId : null,
            productoId: item.tipo === DemandaItemTipo.PRODUCTO ? item.productoId : null,
            cantidadSolicitada: new Prisma.Decimal(item.cantidad),
            isActive: true,
          })),
        },
      },
      include: DEMANDA_INCLUDE,
    });
    return this.toDemandaDto(row);
  }

  async cancelarDemanda(orgId: string, id: string): Promise<DemandaDto> {
    const demanda = await this.requireDemanda(orgId, id);
    if (demanda.estado === DemandaEstado.CANCELADA) {
      return this.toDemandaDto(demanda);
    }
    await this.prisma.$transaction(async (tx) => {
      const reservas = await tx.reserva.findMany({
        where: {
          demandaId: id,
          estado: { in: [ReservaEstado.PRE_RESERVA, ReservaEstado.RESERVADA] },
        },
        include: { items: true },
      });
      for (const reserva of reservas) {
        await this.liberarEnTx(tx, reserva);
      }
      await tx.demanda.update({
        where: { id },
        data: { estado: DemandaEstado.CANCELADA },
      });
    });
    return this.getDemanda(orgId, id);
  }

  async simularItem(
    orgId: string,
    demandaId: string,
    itemId: string,
  ): Promise<SimulacionReservaDto> {
    const demanda = await this.requireDemanda(orgId, demandaId);
    const item = demanda.items.find((row) => row.id === itemId);
    if (!item) {
      throw new NotFoundException('Línea de demanda no encontrada');
    }
    const cubierto = this.cantidadCubierta(item);
    const pendiente = Math.max(0, Number(item.cantidadSolicitada) - cubierto);
    return this.simular(demanda.acopioId, item, pendiente);
  }

  async planEscaso(orgId: string, acopioId: string): Promise<PlanEscasoDto> {
    const acopio = await this.prisma.acopio.findFirst({
      where: { id: acopioId, organizationId: orgId },
    });
    if (!acopio) {
      throw new NotFoundException('Acopio no encontrado');
    }
    const demandas = await this.prisma.demanda.findMany({
      where: {
        organizationId: orgId,
        acopioId,
        isActive: true,
        estado: { in: [DemandaEstado.ABIERTA, DemandaEstado.PARCIAL] },
      },
      include: DEMANDA_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    type Pendiente = {
      itemId: string;
      demandaId: string;
      codigo: string;
      destinoNombre: string;
      prioridad: DemandaDto['prioridad'];
      fechaRequerida: string | null;
      createdAt: string;
      solicitado: number;
      kitKey: string;
      item: (typeof demandas)[number]['items'][number];
    };
    const pendientes: Pendiente[] = [];

    for (const demanda of demandas) {
      for (const item of demanda.items.filter(
        (row) => row.isActive && row.tipo === DemandaItemTipo.KIT,
      )) {
        const cubierto = this.cantidadCubierta(item);
        const solicitado = Math.max(0, Number(item.cantidadSolicitada) - cubierto);
        if (solicitado <= 0) {
          continue;
        }
        pendientes.push({
          itemId: item.id,
          demandaId: demanda.id,
          codigo: demanda.codigo,
          destinoNombre: demanda.destinoNombre,
          prioridad: demanda.prioridad,
          fechaRequerida: demanda.fechaRequerida?.toISOString().slice(0, 10) ?? null,
          createdAt: demanda.createdAt.toISOString(),
          solicitado,
          kitKey: item.kitId ?? `item:${item.id}`,
          item,
        });
      }
    }

    const grupos = new Map<string, Pendiente[]>();
    for (const row of pendientes) {
      const lista = grupos.get(row.kitKey) ?? [];
      lista.push(row);
      grupos.set(row.kitKey, lista);
    }

    const lineas: PlanEscasoDto['lineas'] = [];
    let kitsPosibles = 0;
    for (const grupo of grupos.values()) {
      const prototipo = grupo[0];
      if (!prototipo) {
        continue;
      }
      let tope = 0;
      try {
        const sim = await this.simular(acopioId, prototipo.item, 1);
        tope = sim.posible;
      } catch {
        tope = 0;
      }
      kitsPosibles += tope;
      const reparto = repartirKitsEscasos(
        grupo.map((row) => ({
          id: row.itemId,
          prioridad: row.prioridad,
          fechaRequerida: row.fechaRequerida,
          createdAt: row.createdAt,
          kitsSolicitados: row.solicitado,
        })),
        tope,
      );
      const porItem = new Map(reparto.map((row) => [row.demandaId, row]));
      for (const row of grupo) {
        const asignado = porItem.get(row.itemId);
        lineas.push({
          demandaId: row.demandaId,
          demandaCodigo: row.codigo,
          destinoNombre: row.destinoNombre,
          prioridad: row.prioridad,
          solicitado: row.solicitado,
          propuesto: asignado?.kits ?? 0,
          deficit: row.solicitado - (asignado?.kits ?? 0),
        });
      }
    }
    return { kitsPosibles, lineas };
  }

  async crearReserva(
    orgId: string,
    usuarioId: string,
    demandaId: string,
    dto: CrearReservaDto,
  ): Promise<ReservaDto> {
    const demanda = await this.requireDemanda(orgId, demandaId);
    if (demanda.estado === DemandaEstado.CANCELADA || demanda.estado === DemandaEstado.CERRADA) {
      throw new BadRequestException('Esta demanda ya no admite reservas');
    }
    const item = demanda.items.find((row) => row.id === dto.demandaItemId);
    if (!item?.isActive) {
      throw new NotFoundException('Línea de demanda no encontrada');
    }
    const cubierto = this.cantidadCubierta(item);
    const pendiente = Math.max(0, Number(item.cantidadSolicitada) - cubierto);
    if (pendiente <= 0) {
      throw new BadRequestException('Esta línea ya está cubierta');
    }
    const sim = await this.simular(demanda.acopioId, item, pendiente);
    const pedir =
      dto.cantidad && dto.cantidad > 0
        ? Math.min(dto.cantidad, pendiente, sim.posible)
        : sim.posible;
    if (pedir <= 0) {
      throw new BadRequestException('No hay inventario ubicado suficiente para reservar');
    }
    const firme = dto.firme === true;
    const plan = await this.simular(demanda.acopioId, item, pedir);

    const reserva = await this.prisma.$transaction(async (tx) => {
      const codigo = await this.counters.codigoReserva(orgId);
      const created = await tx.reserva.create({
        data: {
          codigo,
          organizationId: orgId,
          acopioId: demanda.acopioId,
          demandaId: demanda.id,
          demandaItemId: item.id,
          kitId: item.kitId,
          estado: firme ? ReservaEstado.RESERVADA : ReservaEstado.PRE_RESERVA,
          cantidad: new Prisma.Decimal(pedir),
          observaciones: blankToNull(dto.observaciones ?? ''),
          createdById: usuarioId,
          confirmedAt: firme ? new Date() : null,
          isActive: true,
        },
      });
      for (const req of plan.requerimientos) {
        const reservaItem = await tx.reservaItem.create({
          data: {
            reservaId: created.id,
            productoId: req.productoId,
            cantidadRequerida: new Prisma.Decimal(req.requerido),
            cantidadAsignada: new Prisma.Decimal(req.cubierto),
            isActive: true,
          },
        });
        for (const asig of req.plan) {
          if (!asig.inventoryItemId || !asig.ubicacionId) {
            continue;
          }
          await tx.reservaAsignacion.create({
            data: {
              reservaItemId: reservaItem.id,
              inventoryItemId: asig.inventoryItemId,
              ubicacionId: asig.ubicacionId,
              cantidad: new Prisma.Decimal(asig.cantidad),
              isActive: true,
            },
          });
        }
      }
      return created.id;
    });

    await this.refrescarEstadoDemanda(demanda.id);
    return this.getReserva(orgId, reserva);
  }

  async confirmarReserva(orgId: string, id: string): Promise<ReservaDto> {
    const reserva = await this.prisma.reserva.findFirst({
      where: { id, organizationId: orgId },
      include: RESERVA_INCLUDE,
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    if (reserva.estado !== ReservaEstado.PRE_RESERVA) {
      throw new BadRequestException('Solo se confirma una pre-reserva');
    }
    const demanda = await this.requireDemanda(orgId, reserva.demandaId);
    const item = demanda.items.find((row) => row.id === reserva.demandaItemId);
    if (!item) {
      throw new NotFoundException('Línea de demanda no encontrada');
    }
    const sim = await this.simular(reserva.acopioId, item, Number(reserva.cantidad), reserva.id);
    if (sim.posible + 0.001 < Number(reserva.cantidad)) {
      throw new BadRequestException(
        `Ya no hay stock para confirmar ${reserva.cantidad}. Disponible para ${sim.posible}. Liberá y volvé a reservar.`,
      );
    }
    await this.prisma.reserva.update({
      where: { id },
      data: { estado: ReservaEstado.RESERVADA, confirmedAt: new Date() },
    });
    await this.refrescarEstadoDemanda(reserva.demandaId);
    return this.getReserva(orgId, id);
  }

  async liberarReserva(orgId: string, id: string): Promise<ReservaDto> {
    const reserva = await this.prisma.reserva.findFirst({
      where: { id, organizationId: orgId },
      include: { items: true },
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    if (
      reserva.estado !== ReservaEstado.PRE_RESERVA &&
      reserva.estado !== ReservaEstado.RESERVADA
    ) {
      throw new BadRequestException('Esta reserva ya no está activa');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.liberarEnTx(tx, reserva);
    });
    await this.refrescarEstadoDemanda(reserva.demandaId);
    return this.getReserva(orgId, id);
  }

  async getReserva(orgId: string, id: string): Promise<ReservaDto> {
    const row = await this.prisma.reserva.findFirst({
      where: { id, organizationId: orgId },
      include: RESERVA_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return this.toReservaDto(row);
  }

  async listReservas(orgId: string, acopioId: string): Promise<ReservaDto[]> {
    const rows = await this.prisma.reserva.findMany({
      where: { organizationId: orgId, acopioId, isActive: true },
      include: RESERVA_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toReservaDto(row));
  }

  /** Saldos firmes (bloquean disponible) y pre-reserva (informativa). */
  async compromisosPorSaldo(acopioId: string): Promise<{
    firme: Map<string, number>;
    pre: Map<string, number>;
    firmeItem: Map<string, number>;
    preItem: Map<string, number>;
  }> {
    const rows = await this.prisma.reservaAsignacion.findMany({
      where: {
        isActive: true,
        reservaItem: {
          isActive: true,
          reserva: {
            acopioId,
            isActive: true,
            estado: { in: [ReservaEstado.PRE_RESERVA, ReservaEstado.RESERVADA] },
          },
        },
      },
      include: {
        reservaItem: { select: { reserva: { select: { estado: true } } } },
      },
    });
    const firme = new Map<string, number>();
    const pre = new Map<string, number>();
    const firmeItem = new Map<string, number>();
    const preItem = new Map<string, number>();
    const add = (map: Map<string, number>, key: string, qty: number) => {
      map.set(key, (map.get(key) ?? 0) + qty);
    };
    for (const row of rows) {
      const qty = Number(row.cantidad);
      const loc = `${row.inventoryItemId}:${row.ubicacionId}`;
      if (row.reservaItem.reserva.estado === ReservaEstado.RESERVADA) {
        add(firme, loc, qty);
        add(firmeItem, row.inventoryItemId, qty);
      } else {
        add(pre, loc, qty);
        add(preItem, row.inventoryItemId, qty);
      }
    }
    return { firme, pre, firmeItem, preItem };
  }

  async cantidadReservadaEn(inventoryItemId: string, ubicacionId: string): Promise<number> {
    const rows = await this.prisma.reservaAsignacion.aggregate({
      where: {
        inventoryItemId,
        ubicacionId,
        isActive: true,
        reservaItem: {
          isActive: true,
          reserva: { estado: ReservaEstado.RESERVADA, isActive: true },
        },
      },
      _sum: { cantidad: true },
    });
    return Number(rows._sum.cantidad ?? 0);
  }

  private async simular(
    acopioId: string,
    item: {
      id: string;
      tipo: DemandaItemTipo;
      kitId: string | null;
      productoId: string | null;
      kit: {
        nombre: string;
        componentes: Array<{
          productoId: string;
          cantidad: Prisma.Decimal;
          isActive: boolean;
          producto: { nombre: string };
        }>;
      } | null;
      producto: { id: string; nombre: string } | null;
    },
    cantidad: number,
    ignorarReservaId?: string,
  ): Promise<SimulacionReservaDto> {
    const bom = this.bomDe(item);
    if (bom.length === 0) {
      throw new BadRequestException('El kit no tiene componentes activos');
    }
    const pool = await this.poolDisponible(
      acopioId,
      bom.map((row) => row.productoId),
      ignorarReservaId,
    );
    const disponiblePorProducto = new Map<string, number>();
    for (const [productoId, candidatos] of pool) {
      disponiblePorProducto.set(
        productoId,
        candidatos.reduce((sum, row) => sum + row.disponible, 0),
      );
    }
    const posible = maxKits(
      bom.map((row) => ({ productoId: row.productoId, porKit: row.porUnidad })),
      disponiblePorProducto,
    );
    const usar = Math.min(cantidad, posible);
    const requerimientos = bom.map((comp) => {
      const requerido = usar * comp.porUnidad;
      const candidatos = pool.get(comp.productoId) ?? [];
      const plan = asignarCantidad(requerido, candidatos);
      return {
        productoId: comp.productoId,
        productoNombre: comp.nombre,
        porUnidad: comp.porUnidad,
        requerido: cantidad * comp.porUnidad,
        disponible: disponiblePorProducto.get(comp.productoId) ?? 0,
        cubierto: plan.cubierto,
        deficit: Math.max(0, cantidad * comp.porUnidad - plan.cubierto),
        plan: plan.lineas.map((linea) => ({
          inventoryItemId: linea.inventoryItemId,
          inventoryNombre: undefined,
          loteCodigo: linea.loteCodigo,
          vencimiento: linea.vencimiento,
          ubicacionId: linea.ubicacionId,
          ubicacionCodigo: linea.codigoUbicacion,
          cantidad: linea.cantidad,
        })),
      };
    });
    return {
      demandaItemId: item.id,
      solicitado: cantidad,
      posible,
      deficit: Math.max(0, cantidad - posible),
      cobertura: cantidad > 0 ? posible / cantidad : 0,
      requerimientos,
    };
  }

  private bomDe(item: {
    tipo: DemandaItemTipo;
    productoId: string | null;
    producto: { id: string; nombre: string } | null;
    kit: {
      componentes: Array<{
        productoId: string;
        cantidad: Prisma.Decimal;
        isActive: boolean;
        producto: { nombre: string };
      }>;
    } | null;
  }): Array<{ productoId: string; nombre: string; porUnidad: number }> {
    if (item.tipo === DemandaItemTipo.PRODUCTO && item.productoId && item.producto) {
      return [{ productoId: item.productoId, nombre: item.producto.nombre, porUnidad: 1 }];
    }
    return (item.kit?.componentes ?? [])
      .filter((row) => row.isActive)
      .map((row) => ({
        productoId: row.productoId,
        nombre: row.producto.nombre,
        porUnidad: Number(row.cantidad),
      }));
  }

  private async poolDisponible(
    acopioId: string,
    productoIds: string[],
    ignorarReservaId?: string,
  ): Promise<Map<string, CandidatoSaldo[]>> {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        acopioId,
        isActive: true,
        productoId: { in: productoIds },
        estado: { not: InventoryEstado.VENCIDO },
      },
      include: {
        balances: {
          where: { isActive: true },
          include: { ubicacion: true },
        },
      },
    });
    const compromisos = await this.compromisosPorSaldo(acopioId);
    let ignorar = new Map<string, number>();
    if (ignorarReservaId) {
      const propias = await this.prisma.reservaAsignacion.findMany({
        where: {
          isActive: true,
          reservaItem: { reservaId: ignorarReservaId },
        },
      });
      ignorar = new Map();
      for (const row of propias) {
        const key = `${row.inventoryItemId}:${row.ubicacionId}`;
        ignorar.set(key, (ignorar.get(key) ?? 0) + Number(row.cantidad));
      }
    }
    const porProducto = new Map<string, CandidatoSaldo[]>();
    for (const item of items) {
      if (!item.productoId) {
        continue;
      }
      const lista = porProducto.get(item.productoId) ?? [];
      for (const balance of item.balances) {
        if (!FUNCIONES_RESERVA.has(balance.ubicacion.funcion)) {
          continue;
        }
        if (!balance.ubicacion.isActive || balance.ubicacion.estado !== UbicacionEstado.ACTIVA) {
          continue;
        }
        const key = `${item.id}:${balance.ubicacionId}`;
        const firme = (compromisos.firme.get(key) ?? 0) - (ignorar.get(key) ?? 0);
        const disponible = Math.max(0, Number(balance.cantidad) - Math.max(0, firme));
        if (disponible <= 0.001) {
          continue;
        }
        lista.push({
          inventoryItemId: item.id,
          ubicacionId: balance.ubicacionId,
          codigoUbicacion: balance.ubicacion.codigo,
          loteCodigo: item.loteCodigo,
          vencimiento: item.vencimiento ? item.vencimiento.toISOString().slice(0, 10) : null,
          disponible,
        });
      }
      porProducto.set(item.productoId, lista);
    }
    return porProducto;
  }

  private cantidadCubierta(item: {
    reservas: Array<{ estado: ReservaEstado; cantidad: Prisma.Decimal; isActive: boolean }>;
  }): number {
    return item.reservas
      .filter((row) => row.isActive && row.estado === ReservaEstado.RESERVADA)
      .reduce((sum, row) => sum + Number(row.cantidad), 0);
  }

  private async refrescarEstadoDemanda(demandaId: string) {
    const demanda = await this.prisma.demanda.findFirst({
      where: { id: demandaId },
      include: DEMANDA_INCLUDE,
    });
    if (!demanda || demanda.estado === DemandaEstado.CANCELADA) {
      return;
    }
    const items = demanda.items.filter((row) => row.isActive);
    const cubiertos = items.filter((row) => {
      const cubierto = this.cantidadCubierta(row);
      return cubierto + 0.001 >= Number(row.cantidadSolicitada);
    }).length;
    const alguno = items.some((row) => this.cantidadCubierta(row) > 0.001);
    let estado: DemandaEstado = DemandaEstado.ABIERTA;
    if (items.length > 0 && cubiertos === items.length) {
      estado = DemandaEstado.CUBIERTA;
    } else if (alguno) {
      estado = DemandaEstado.PARCIAL;
    }
    await this.prisma.demanda.update({
      where: { id: demandaId },
      data: { estado },
    });
  }

  private async liberarEnTx(
    tx: Prisma.TransactionClient,
    reserva: { id: string; items: Array<{ id: string }> },
  ) {
    await tx.reservaAsignacion.updateMany({
      where: { reservaItem: { reservaId: reserva.id } },
      data: { isActive: false },
    });
    await tx.reservaItem.updateMany({
      where: { reservaId: reserva.id },
      data: { isActive: false },
    });
    await tx.reserva.update({
      where: { id: reserva.id },
      data: { estado: ReservaEstado.LIBERADA, releasedAt: new Date() },
    });
  }

  private async requireKit(orgId: string, id: string) {
    const row = await this.prisma.kit.findFirst({
      where: { id, organizationId: orgId },
      include: KIT_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Kit no encontrado');
    }
    return row;
  }

  private async requireDemanda(orgId: string, id: string) {
    const row = await this.prisma.demanda.findFirst({
      where: { id, organizationId: orgId },
      include: DEMANDA_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Demanda no encontrada');
    }
    return row;
  }

  private async requireProductos(ids: string[]) {
    const rows = await this.prisma.producto.findMany({
      where: { id: { in: ids }, isActive: true },
    });
    if (rows.length !== new Set(ids).size) {
      throw new NotFoundException('Hay un producto del catálogo que no existe');
    }
  }

  private toKitDto(row: {
    id: string;
    organizationId: string;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    isActive: boolean;
    componentes: Array<{
      id: string;
      kitId: string;
      productoId: string;
      cantidad: Prisma.Decimal;
      isActive: boolean;
      producto: { nombre: string; sku: string };
    }>;
  }): KitDto {
    return {
      id: row.id,
      organizationId: row.organizationId,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      isActive: row.isActive,
      componentes: row.componentes
        .filter((comp) => comp.isActive)
        .map((comp) => ({
          id: comp.id,
          kitId: comp.kitId,
          productoId: comp.productoId,
          productoNombre: comp.producto.nombre,
          productoSku: comp.producto.sku,
          cantidad: Number(comp.cantidad),
        })),
    };
  }

  private async toDemandaDto(row: {
    id: string;
    codigo: string;
    organizationId: string;
    acopioId: string;
    destinoNombre: string;
    destinoMunicipio: string | null;
    destinoDepartamento: string | null;
    prioridad: DemandaDto['prioridad'];
    estado: DemandaEstado;
    fechaRequerida: Date | null;
    poblacionAfectada: number | null;
    tipoEmergencia: string | null;
    observaciones: string | null;
    isActive: boolean;
    acopio: { nombre: string };
    items: Array<{
      id: string;
      demandaId: string;
      tipo: DemandaItemTipo;
      kitId: string | null;
      productoId: string | null;
      cantidadSolicitada: Prisma.Decimal;
      kit: { codigo: string; nombre: string } | null;
      producto: { nombre: string } | null;
      reservas: Array<{ estado: ReservaEstado; cantidad: Prisma.Decimal; isActive: boolean }>;
    }>;
  }): Promise<DemandaDto> {
    const items = [];
    for (const item of row.items) {
      const cubierto = this.cantidadCubierta(item);
      const solicitado = Number(item.cantidadSolicitada);
      items.push({
        id: item.id,
        demandaId: item.demandaId,
        tipo: item.tipo,
        kitId: item.kitId,
        kitCodigo: item.kit?.codigo ?? null,
        kitNombre: item.kit?.nombre ?? null,
        productoId: item.productoId,
        productoNombre: item.producto?.nombre ?? null,
        cantidadSolicitada: solicitado,
        cantidadCubierta: cubierto,
        deficit: Math.max(0, solicitado - cubierto),
      });
    }
    const solicitado = items.reduce((sum, item) => sum + item.cantidadSolicitada, 0);
    const cubierto = items.reduce((sum, item) => sum + item.cantidadCubierta, 0);
    return {
      id: row.id,
      codigo: row.codigo,
      organizationId: row.organizationId,
      acopioId: row.acopioId,
      acopioNombre: row.acopio.nombre,
      destinoNombre: row.destinoNombre,
      destinoMunicipio: row.destinoMunicipio,
      destinoDepartamento: row.destinoDepartamento,
      prioridad: row.prioridad,
      estado: row.estado,
      fechaRequerida: row.fechaRequerida ? row.fechaRequerida.toISOString().slice(0, 10) : null,
      poblacionAfectada: row.poblacionAfectada,
      tipoEmergencia: row.tipoEmergencia,
      observaciones: row.observaciones,
      isActive: row.isActive,
      items,
      cobertura: solicitado > 0 ? cubierto / solicitado : 0,
    };
  }

  private toReservaDto(row: {
    id: string;
    codigo: string;
    organizationId: string;
    acopioId: string;
    demandaId: string;
    demandaItemId: string;
    kitId: string | null;
    estado: ReservaEstado;
    cantidad: Prisma.Decimal;
    observaciones: string | null;
    createdAt: Date;
    confirmedAt: Date | null;
    demanda: { codigo: string };
    items: Array<{
      id: string;
      productoId: string;
      cantidadRequerida: Prisma.Decimal;
      cantidadAsignada: Prisma.Decimal;
      producto: { nombre: string };
      asignaciones: Array<{
        id: string;
        inventoryItemId: string;
        ubicacionId: string;
        cantidad: Prisma.Decimal;
        isActive: boolean;
        inventoryItem: { nombre: string; loteCodigo: string | null; vencimiento: Date | null };
        ubicacion: { codigo: string };
      }>;
    }>;
  }): ReservaDto {
    return {
      id: row.id,
      codigo: row.codigo,
      organizationId: row.organizationId,
      acopioId: row.acopioId,
      demandaId: row.demandaId,
      demandaCodigo: row.demanda.codigo,
      demandaItemId: row.demandaItemId,
      kitId: row.kitId,
      estado: row.estado,
      cantidad: Number(row.cantidad),
      observaciones: row.observaciones,
      createdAt: row.createdAt.toISOString(),
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
      items: row.items.map((item) => {
        const requerida = Number(item.cantidadRequerida);
        const asignada = Number(item.cantidadAsignada);
        return {
          id: item.id,
          productoId: item.productoId,
          productoNombre: item.producto.nombre,
          cantidadRequerida: requerida,
          cantidadAsignada: asignada,
          deficit: Math.max(0, requerida - asignada),
          asignaciones: item.asignaciones
            .filter((asig) => asig.isActive)
            .map((asig) => ({
              id: asig.id,
              inventoryItemId: asig.inventoryItemId,
              inventoryNombre: asig.inventoryItem.nombre,
              loteCodigo: asig.inventoryItem.loteCodigo,
              vencimiento: asig.inventoryItem.vencimiento
                ? asig.inventoryItem.vencimiento.toISOString().slice(0, 10)
                : null,
              ubicacionId: asig.ubicacionId,
              ubicacionCodigo: asig.ubicacion.codigo,
              cantidad: Number(asig.cantidad),
            })),
        };
      }),
    };
  }
}

const KIT_INCLUDE = {
  componentes: { include: { producto: { select: { nombre: true, sku: true } } } },
} satisfies Prisma.KitInclude;

const DEMANDA_INCLUDE = {
  acopio: { select: { nombre: true } },
  items: {
    include: {
      kit: {
        include: {
          componentes: { include: { producto: { select: { nombre: true } } } },
        },
      },
      producto: { select: { id: true, nombre: true } },
      reservas: true,
    },
  },
} satisfies Prisma.DemandaInclude;

const RESERVA_INCLUDE = {
  demanda: { select: { codigo: true } },
  items: {
    include: {
      producto: { select: { nombre: true } },
      asignaciones: {
        include: {
          inventoryItem: { select: { nombre: true, loteCodigo: true, vencimiento: true } },
          ubicacion: { select: { codigo: true } },
        },
      },
    },
  },
} satisfies Prisma.ReservaInclude;
