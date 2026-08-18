import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ControlLoteEstado,
  ControlModo,
  ControlResultado,
  InventoryCategoria,
  KitInstanciaEstado,
  Prisma,
  ReservaEstado,
} from '@prisma/client';
import { blankToNull } from '../common/soft-delete';
import { OrgCountersService } from '../org-counters/org-counters.service';
import { PrismaService } from '../prisma/prisma.service';
import { UbicacionesService } from '../ubicaciones/ubicaciones.service';
import type {
  ConfirmarPickLineaDto,
  ConsolidacionDto,
  ControlLoteDto,
  CrearConsolidacionDto,
  CrearControlDto,
  InspeccionarKitDto,
  KitInstanciaDto,
  PipelineDemandaDto,
} from './dto/consolidacion.dto';
import {
  componerKits,
  elegirMuestra,
  evaluarMuestreo,
  type LoteParaKit,
  proponerPallets,
  tamanioMuestra,
} from './packing';

@Injectable()
export class ConsolidacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: OrgCountersService,
    private readonly ubicaciones: UbicacionesService,
  ) {}

  async pipeline(orgId: string, demandaId: string): Promise<PipelineDemandaDto> {
    const demanda = await this.requireDemanda(orgId, demandaId);
    const solicitado = demanda.items
      .filter((row) => row.isActive)
      .reduce((sum, row) => sum + Number(row.cantidadSolicitada), 0);
    const reservas = await this.prisma.reserva.findMany({
      where: { demandaId, isActive: true, estado: ReservaEstado.RESERVADA },
      select: { cantidad: true },
    });
    const reservado = reservas.reduce((sum, row) => sum + Number(row.cantidad), 0);
    const grupos = await this.prisma.kitInstancia.groupBy({
      by: ['estado'],
      where: { demandaId, isActive: true },
      _count: { _all: true },
    });
    const n = (estado: KitInstanciaEstado) =>
      grupos.find((row) => row.estado === estado)?._count._all ?? 0;
    return {
      solicitado,
      reservado,
      pendientePick: n(KitInstanciaEstado.PENDIENTE_PICK),
      armado:
        n(KitInstanciaEstado.ARMADO) +
        n(KitInstanciaEstado.EN_CONTROL) +
        n(KitInstanciaEstado.APROBADO) +
        n(KitInstanciaEstado.OBSERVADO) +
        n(KitInstanciaEstado.RECHAZADO) +
        n(KitInstanciaEstado.CONSOLIDADO) +
        n(KitInstanciaEstado.PALLETIZADO),
      aprobado:
        n(KitInstanciaEstado.APROBADO) +
        n(KitInstanciaEstado.CONSOLIDADO) +
        n(KitInstanciaEstado.PALLETIZADO),
      observado: n(KitInstanciaEstado.OBSERVADO),
      rechazado: n(KitInstanciaEstado.RECHAZADO),
      consolidado: n(KitInstanciaEstado.CONSOLIDADO) + n(KitInstanciaEstado.PALLETIZADO),
      palletizado: n(KitInstanciaEstado.PALLETIZADO),
    };
  }

  async listInstancias(orgId: string, demandaId: string): Promise<KitInstanciaDto[]> {
    await this.requireDemanda(orgId, demandaId);
    const rows = await this.prisma.kitInstancia.findMany({
      where: { organizationId: orgId, demandaId, isActive: true },
      include: INSTANCIA_INCLUDE,
      orderBy: { codigo: 'asc' },
    });
    return rows.map((row) => this.toInstanciaDto(row));
  }

  async getInstancia(orgId: string, id: string): Promise<KitInstanciaDto> {
    const row = await this.prisma.kitInstancia.findFirst({
      where: { id, organizationId: orgId },
      include: INSTANCIA_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Kit no encontrado');
    }
    return this.toInstanciaDto(row);
  }

  async armarDesdeReserva(
    orgId: string,
    usuarioId: string,
    reservaId: string,
  ): Promise<{ creados: number }> {
    void usuarioId;
    const reserva = await this.prisma.reserva.findFirst({
      where: { id: reservaId, organizationId: orgId },
      include: {
        kit: {
          include: {
            componentes: { include: { producto: { select: { categoriaInventario: true } } } },
          },
        },
        items: {
          include: {
            asignaciones: {
              where: { isActive: true },
              include: {
                inventoryItem: {
                  select: { id: true, productoId: true, loteCodigo: true, vencimiento: true },
                },
                ubicacion: { select: { id: true, codigo: true } },
              },
            },
          },
        },
      },
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    if (reserva.estado !== ReservaEstado.RESERVADA) {
      throw new BadRequestException('Solo se arman kits de una reserva firme');
    }
    if (!reserva.kitId || !reserva.kit) {
      throw new BadRequestException('Esta reserva no es de un kit');
    }
    const ya = await this.prisma.kitInstancia.count({ where: { reservaId, isActive: true } });
    if (ya > 0) {
      throw new BadRequestException('Esta reserva ya tiene kits armados');
    }
    const nKits = Math.floor(Number(reserva.cantidad) + 1e-9);
    if (nKits <= 0) {
      throw new BadRequestException('La reserva no tiene cantidad para armar');
    }
    const receta = reserva.kit.componentes
      .filter((row) => row.isActive)
      .map((row) => ({ productoId: row.productoId, porKit: Number(row.cantidad) }));
    const zonaKitting = await this.ubicaciones.resolveZonaKitting(reserva.acopioId);
    const lotes: LoteParaKit[] = [];
    for (const item of reserva.items) {
      for (const asig of item.asignaciones) {
        lotes.push({
          productoId: item.productoId,
          inventoryItemId: asig.inventoryItemId,
          origenUbicacionId: asig.ubicacionId,
          loteCodigo: asig.inventoryItem.loteCodigo,
          vencimiento: asig.inventoryItem.vencimiento
            ? asig.inventoryItem.vencimiento.toISOString().slice(0, 10)
            : null,
          cantidad: Number(asig.cantidad),
        });
      }
    }
    const composiciones = componerKits(nKits, receta, lotes);
    const payloads: Array<{ codigo: string; lineas: (typeof composiciones)[number] }> = [];
    for (let i = 0; i < nKits; i += 1) {
      payloads.push({
        codigo: await this.counters.codigoKitInstancia(orgId),
        lineas: composiciones[i] ?? [],
      });
    }
    await this.prisma.$transaction(
      payloads.map((payload) =>
        this.prisma.kitInstancia.create({
          data: {
            codigo: payload.codigo,
            organizationId: orgId,
            acopioId: reserva.acopioId,
            demandaId: reserva.demandaId,
            reservaId: reserva.id,
            kitId: reserva.kitId as string,
            zonaKittingUbicacionId: zonaKitting.id,
            estado: KitInstanciaEstado.PENDIENTE_PICK,
            isActive: true,
            items: {
              create: payload.lineas.map((linea) => ({
                productoId: linea.productoId,
                inventoryItemId: linea.inventoryItemId,
                origenUbicacionId: linea.origenUbicacionId,
                loteCodigo: linea.loteCodigo,
                vencimiento: linea.vencimiento
                  ? new Date(`${linea.vencimiento}T00:00:00.000Z`)
                  : null,
                cantidad: new Prisma.Decimal(linea.cantidad),
                isActive: true,
              })),
            },
          },
        }),
      ),
    );
    return { creados: nKits };
  }

  async confirmarPickLinea(
    orgId: string,
    usuarioId: string,
    kitInstanciaId: string,
    itemId: string,
    dto: ConfirmarPickLineaDto,
  ): Promise<KitInstanciaDto> {
    const kit = await this.prisma.kitInstancia.findFirst({
      where: { id: kitInstanciaId, organizationId: orgId },
      include: {
        items: {
          where: { isActive: true },
          include: {
            producto: { select: { nombre: true } },
            origenUbicacion: { select: { codigo: true } },
            inventoryItem: { select: { categoria: true } },
          },
        },
        zonaKitting: { select: { codigo: true } },
      },
    });
    if (!kit) {
      throw new NotFoundException('Kit no encontrado');
    }
    if (kit.estado !== KitInstanciaEstado.PENDIENTE_PICK) {
      throw new BadRequestException('Este kit ya no está pendiente de picking');
    }
    const linea = kit.items.find((row) => row.id === itemId);
    if (!linea) {
      throw new NotFoundException('Línea de pick no encontrada');
    }
    if (linea.pickConfirmadoAt) {
      throw new BadRequestException('Esta línea ya fue pickeada');
    }
    if (!linea.inventoryItemId || !linea.origenUbicacionId || !kit.zonaKittingUbicacionId) {
      throw new BadRequestException('La línea no tiene origen o zona de kitting definida');
    }

    await this.ubicaciones.moverParaPick({
      orgId,
      acopioId: kit.acopioId,
      usuarioId,
      reservaId: kit.reservaId,
      inventoryItemId: linea.inventoryItemId,
      origenUbicacionId: linea.origenUbicacionId,
      destinoUbicacionId: kit.zonaKittingUbicacionId,
      cantidad: Number(linea.cantidad),
      kitInstanciaItemId: linea.id,
      categoriaInventario: linea.inventoryItem?.categoria ?? 'OTROS',
      codigoOrigen: dto.codigoOrigen,
      codigoDestino: dto.codigoDestino,
    });

    await this.prisma.kitInstanciaItem.update({
      where: { id: linea.id },
      data: { pickConfirmadoAt: new Date() },
    });

    return this.getInstancia(orgId, kitInstanciaId);
  }

  async confirmarKitArmado(orgId: string, kitInstanciaId: string): Promise<KitInstanciaDto> {
    const kit = await this.prisma.kitInstancia.findFirst({
      where: { id: kitInstanciaId, organizationId: orgId },
      include: { items: { where: { isActive: true } } },
    });
    if (!kit) {
      throw new NotFoundException('Kit no encontrado');
    }
    if (kit.estado !== KitInstanciaEstado.PENDIENTE_PICK) {
      throw new BadRequestException('Este kit ya fue armado');
    }
    const pendientes = kit.items.filter((row) => !row.pickConfirmadoAt);
    if (pendientes.length > 0) {
      throw new BadRequestException('Faltan líneas por pickear antes de confirmar el kit');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.kitInstancia.update({
        where: { id: kitInstanciaId },
        data: { estado: KitInstanciaEstado.ARMADO },
      });
      await this.evaluarReservaConsumida(tx, kit.reservaId);
    });

    return this.getInstancia(orgId, kitInstanciaId);
  }

  async crearControl(
    orgId: string,
    usuarioId: string,
    dto: CrearControlDto,
  ): Promise<ControlLoteDto> {
    const reserva = await this.prisma.reserva.findFirst({
      where: { id: dto.reservaId, organizationId: orgId },
      include: {
        kit: {
          include: {
            componentes: { include: { producto: { select: { categoriaInventario: true } } } },
          },
        },
      },
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    const abierto = await this.prisma.controlLote.findFirst({
      where: {
        reservaId: reserva.id,
        isActive: true,
        estado: { in: [ControlLoteEstado.ABIERTO, ControlLoteEstado.REQUIERE_TOTAL] },
      },
    });
    if (abierto) {
      throw new BadRequestException('Ya hay un control abierto para esta reserva');
    }
    const instancias = await this.prisma.kitInstancia.findMany({
      where: {
        reservaId: reserva.id,
        isActive: true,
        estado: { in: [KitInstanciaEstado.ARMADO, KitInstanciaEstado.OBSERVADO] },
      },
      select: { id: true },
    });
    if (instancias.length === 0) {
      throw new BadRequestException(
        'No hay kits armados para controlar. Armalos desde la reserva.',
      );
    }
    const critico =
      reserva.kit?.esCritico === true ||
      (reserva.kit?.componentes ?? []).some(
        (row) =>
          row.isActive &&
          (row.producto.categoriaInventario === InventoryCategoria.MEDICAMENTOS ||
            row.producto.categoriaInventario === InventoryCategoria.MEDICAMENTO_MASCOTAS),
      );
    const modo = critico ? ControlModo.TOTAL : (dto.modo ?? ControlModo.MUESTREO);
    const objetivo =
      modo === ControlModo.TOTAL
        ? instancias.length
        : tamanioMuestra(instancias.length, dto.porcentajeMuestra ?? 0.1);
    const muestraIds = elegirMuestra(
      instancias.map((row) => row.id),
      objetivo,
      Date.now() % 1_000_000,
    );
    const codigo = await this.counters.codigoControl(orgId);
    const created = await this.prisma.$transaction(async (tx) => {
      const lote = await tx.controlLote.create({
        data: {
          codigo,
          organizationId: orgId,
          acopioId: reserva.acopioId,
          demandaId: reserva.demandaId,
          reservaId: reserva.id,
          modo,
          muestraObjetivo: objetivo,
          umbralDefecto: new Prisma.Decimal(dto.umbralDefecto ?? 0.05),
          estado: ControlLoteEstado.ABIERTO,
          createdById: usuarioId,
          isActive: true,
        },
      });
      await tx.controlInspeccion.createMany({
        data: muestraIds.map((kitInstanciaId) => ({
          controlLoteId: lote.id,
          kitInstanciaId,
          resultado: ControlResultado.PENDIENTE,
          isActive: true,
        })),
      });
      await tx.kitInstancia.updateMany({
        where: { id: { in: muestraIds } },
        data: { estado: KitInstanciaEstado.EN_CONTROL },
      });
      return lote.id;
    });
    return this.getControl(orgId, created);
  }

  async getControl(orgId: string, id: string): Promise<ControlLoteDto> {
    const row = await this.prisma.controlLote.findFirst({
      where: { id, organizationId: orgId },
      include: CONTROL_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Control no encontrado');
    }
    return this.toControlDto(row);
  }

  async listControles(orgId: string, demandaId: string): Promise<ControlLoteDto[]> {
    await this.requireDemanda(orgId, demandaId);
    const rows = await this.prisma.controlLote.findMany({
      where: { organizationId: orgId, demandaId, isActive: true },
      include: CONTROL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toControlDto(row));
  }

  async inspeccionar(
    orgId: string,
    controlId: string,
    inspeccionId: string,
    dto: InspeccionarKitDto,
  ): Promise<ControlLoteDto> {
    if (dto.resultado === ControlResultado.PENDIENTE) {
      throw new BadRequestException('Elegí un resultado de control');
    }
    const control = await this.prisma.controlLote.findFirst({
      where: { id: controlId, organizationId: orgId },
    });
    if (!control) {
      throw new NotFoundException('Control no encontrado');
    }
    if (control.estado === ControlLoteEstado.CERRADO) {
      throw new BadRequestException('Este control ya está cerrado');
    }
    const inspeccion = await this.prisma.controlInspeccion.findFirst({
      where: { id: inspeccionId, controlLoteId: controlId },
    });
    if (!inspeccion) {
      throw new NotFoundException('Inspección no encontrada');
    }
    const estadoKit =
      dto.resultado === ControlResultado.APROBADO
        ? KitInstanciaEstado.APROBADO
        : dto.resultado === ControlResultado.OBSERVADO
          ? KitInstanciaEstado.OBSERVADO
          : KitInstanciaEstado.RECHAZADO;
    await this.prisma.$transaction(async (tx) => {
      await tx.controlInspeccion.update({
        where: { id: inspeccion.id },
        data: {
          resultado: dto.resultado,
          observaciones: blankToNull(dto.observaciones ?? ''),
          inspeccionadoAt: new Date(),
        },
      });
      await tx.kitInstancia.update({
        where: { id: inspeccion.kitInstanciaId },
        data: { estado: estadoKit },
      });
    });
    return this.evaluarYCerrarSiCorresponde(orgId, controlId);
  }

  async expandirATotal(orgId: string, controlId: string): Promise<ControlLoteDto> {
    const control = await this.prisma.controlLote.findFirst({
      where: { id: controlId, organizationId: orgId },
    });
    if (!control) {
      throw new NotFoundException('Control no encontrado');
    }
    const ya = await this.prisma.controlInspeccion.findMany({
      where: { controlLoteId: controlId, isActive: true },
      select: { kitInstanciaId: true },
    });
    const idsYa = new Set(ya.map((row) => row.kitInstanciaId));
    const resto = await this.prisma.kitInstancia.findMany({
      where: {
        reservaId: control.reservaId,
        isActive: true,
        estado: { in: [KitInstanciaEstado.ARMADO, KitInstanciaEstado.OBSERVADO] },
        id: { notIn: [...idsYa] },
      },
      select: { id: true },
    });
    await this.prisma.$transaction(async (tx) => {
      if (resto.length > 0) {
        await tx.controlInspeccion.createMany({
          data: resto.map((row) => ({
            controlLoteId: controlId,
            kitInstanciaId: row.id,
            resultado: ControlResultado.PENDIENTE,
            isActive: true,
          })),
        });
        await tx.kitInstancia.updateMany({
          where: { id: { in: resto.map((row) => row.id) } },
          data: { estado: KitInstanciaEstado.EN_CONTROL },
        });
      }
      await tx.controlLote.update({
        where: { id: controlId },
        data: {
          modo: ControlModo.TOTAL,
          muestraObjetivo: idsYa.size + resto.length,
          estado: ControlLoteEstado.ABIERTO,
        },
      });
    });
    return this.getControl(orgId, controlId);
  }

  async consolidar(
    orgId: string,
    usuarioId: string,
    demandaId: string,
    dto: CrearConsolidacionDto,
  ): Promise<ConsolidacionDto> {
    const demanda = await this.requireDemanda(orgId, demandaId);
    const abiertos = await this.prisma.controlLote.count({
      where: {
        demandaId,
        isActive: true,
        estado: { in: [ControlLoteEstado.ABIERTO, ControlLoteEstado.REQUIERE_TOTAL] },
      },
    });
    if (abiertos > 0) {
      throw new BadRequestException('Cerrá el control abierto antes de consolidar');
    }
    const aprobados = await this.prisma.kitInstancia.findMany({
      where: { demandaId, isActive: true, estado: KitInstanciaEstado.APROBADO },
      include: { kit: { select: { pesoKgEstimado: true, altoMEstimado: true } } },
    });
    if (aprobados.length === 0) {
      throw new BadRequestException('No hay kits aprobados para consolidar');
    }
    const kitPeso =
      dto.kitPesoKg ??
      (aprobados[0]?.kit.pesoKgEstimado ? Number(aprobados[0].kit.pesoKgEstimado) : 20);
    const kitAlto =
      dto.kitAltoM ??
      (aprobados[0]?.kit.altoMEstimado ? Number(aprobados[0].kit.altoMEstimado) : null);
    const codigo = await this.counters.codigoConsolidacion(orgId);
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.consolidacion.create({
        data: {
          codigo,
          organizationId: orgId,
          acopioId: demanda.acopioId,
          demandaId,
          destinoNombre: demanda.destinoNombre,
          kitPesoKg: new Prisma.Decimal(kitPeso),
          palletPesoMaxKg: new Prisma.Decimal(dto.palletPesoMaxKg ?? 800),
          kitAltoM: kitAlto != null ? new Prisma.Decimal(kitAlto) : null,
          palletAltoMaxM:
            dto.palletAltoMaxM != null
              ? new Prisma.Decimal(dto.palletAltoMaxM)
              : new Prisma.Decimal(1.8),
          createdById: usuarioId,
          isActive: true,
        },
      });
      await tx.consolidacionKit.createMany({
        data: aprobados.map((kit) => ({
          consolidacionId: row.id,
          kitInstanciaId: kit.id,
          isActive: true,
        })),
      });
      await tx.kitInstancia.updateMany({
        where: { id: { in: aprobados.map((kit) => kit.id) } },
        data: { estado: KitInstanciaEstado.CONSOLIDADO },
      });
      return row.id;
    });
    return this.getConsolidacion(orgId, created);
  }

  async getConsolidacion(orgId: string, id: string): Promise<ConsolidacionDto> {
    const row = await this.prisma.consolidacion.findFirst({
      where: { id, organizationId: orgId },
      include: { demanda: { select: { codigo: true } }, kits: { where: { isActive: true } } },
    });
    if (!row) {
      throw new NotFoundException('Consolidación no encontrada');
    }
    return this.toConsolidacionDto(row);
  }

  async listConsolidaciones(orgId: string, demandaId: string): Promise<ConsolidacionDto[]> {
    await this.requireDemanda(orgId, demandaId);
    const rows = await this.prisma.consolidacion.findMany({
      where: { organizationId: orgId, demandaId, isActive: true },
      include: { demanda: { select: { codigo: true } }, kits: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toConsolidacionDto(row));
  }

  async proponerParaDemanda(
    orgId: string,
    demandaId: string,
  ): Promise<ReturnType<typeof proponerPallets> & { kits: number }> {
    await this.requireDemanda(orgId, demandaId);
    const n = await this.prisma.kitInstancia.count({
      where: { demandaId, isActive: true, estado: KitInstanciaEstado.APROBADO },
    });
    const kit = await this.prisma.kitInstancia.findFirst({
      where: { demandaId, isActive: true },
      include: { kit: true },
    });
    const plan = proponerPallets({
      nKits: n,
      kitPesoKg: kit?.kit.pesoKgEstimado ? Number(kit.kit.pesoKgEstimado) : 20,
      palletPesoMaxKg: 800,
      kitAltoM: kit?.kit.altoMEstimado ? Number(kit.kit.altoMEstimado) : 0.06,
      palletAltoMaxM: 1.8,
    });
    return { ...plan, kits: n };
  }

  private async evaluarYCerrarSiCorresponde(
    orgId: string,
    controlId: string,
  ): Promise<ControlLoteDto> {
    const row = await this.prisma.controlLote.findFirst({
      where: { id: controlId },
      include: { inspecciones: true },
    });
    if (!row) {
      throw new NotFoundException('Control no encontrado');
    }
    const ev = evaluarMuestreo(
      row.inspecciones.map((ins) => ins.resultado),
      Number(row.umbralDefecto),
      row.modo,
    );
    if (ev.requiereTotal && row.estado === ControlLoteEstado.ABIERTO) {
      await this.prisma.controlLote.update({
        where: { id: controlId },
        data: { estado: ControlLoteEstado.REQUIERE_TOTAL },
      });
    } else if (ev.inspeccionados === row.inspecciones.length && row.inspecciones.length > 0) {
      await this.prisma.controlLote.update({
        where: { id: controlId },
        data: { estado: ControlLoteEstado.CERRADO },
      });
    }
    return this.getControl(orgId, controlId);
  }

  private async evaluarReservaConsumida(
    tx: Prisma.TransactionClient,
    reservaId: string,
  ): Promise<void> {
    const pendientes = await tx.kitInstancia.count({
      where: { reservaId, isActive: true, estado: KitInstanciaEstado.PENDIENTE_PICK },
    });
    if (pendientes > 0) {
      return;
    }
    const total = await tx.kitInstancia.count({ where: { reservaId, isActive: true } });
    if (total === 0) {
      return;
    }
    await tx.reserva.update({
      where: { id: reservaId },
      data: { estado: ReservaEstado.CONSUMIDA },
    });
  }

  private async requireDemanda(orgId: string, id: string) {
    const row = await this.prisma.demanda.findFirst({
      where: { id, organizationId: orgId },
      include: { items: true },
    });
    if (!row) {
      throw new NotFoundException('Demanda no encontrada');
    }
    return row;
  }

  private toInstanciaDto(row: {
    id: string;
    codigo: string;
    reservaId: string;
    demandaId: string;
    kitId: string;
    estado: KitInstanciaEstado;
    kit: { nombre: string };
    zonaKitting?: { codigo: string } | null;
    items: Array<{
      id: string;
      productoId: string;
      inventoryItemId: string | null;
      origenUbicacionId: string | null;
      loteCodigo: string | null;
      vencimiento: Date | null;
      cantidad: Prisma.Decimal;
      pickConfirmadoAt: Date | null;
      producto: { nombre: string };
      origenUbicacion?: { codigo: string } | null;
    }>;
  }): KitInstanciaDto {
    return {
      id: row.id,
      codigo: row.codigo,
      reservaId: row.reservaId,
      demandaId: row.demandaId,
      kitId: row.kitId,
      kitNombre: row.kit.nombre,
      estado: row.estado,
      zonaKittingCodigo: row.zonaKitting?.codigo ?? null,
      items: row.items.map((item) => ({
        id: item.id,
        productoId: item.productoId,
        productoNombre: item.producto.nombre,
        inventoryItemId: item.inventoryItemId,
        origenUbicacionId: item.origenUbicacionId,
        origenUbicacionCodigo: item.origenUbicacion?.codigo ?? null,
        loteCodigo: item.loteCodigo,
        vencimiento: item.vencimiento ? item.vencimiento.toISOString().slice(0, 10) : null,
        cantidad: Number(item.cantidad),
        pickConfirmadoAt: item.pickConfirmadoAt?.toISOString() ?? null,
      })),
    };
  }

  private toControlDto(row: {
    id: string;
    codigo: string;
    reservaId: string;
    demandaId: string;
    modo: ControlModo;
    muestraObjetivo: number;
    umbralDefecto: Prisma.Decimal;
    estado: ControlLoteEstado;
    inspecciones: Array<{
      id: string;
      kitInstanciaId: string;
      resultado: ControlResultado;
      observaciones: string | null;
      kitInstancia: {
        codigo: string;
        items: Array<{
          id: string;
          productoId: string;
          inventoryItemId: string | null;
          loteCodigo: string | null;
          vencimiento: Date | null;
          cantidad: Prisma.Decimal;
          producto: { nombre: string };
        }>;
      };
    }>;
  }): ControlLoteDto {
    const ev = evaluarMuestreo(
      row.inspecciones.map((ins) => ins.resultado),
      Number(row.umbralDefecto),
      row.modo,
    );
    return {
      id: row.id,
      codigo: row.codigo,
      reservaId: row.reservaId,
      demandaId: row.demandaId,
      modo: row.modo,
      muestraObjetivo: row.muestraObjetivo,
      umbralDefecto: Number(row.umbralDefecto),
      estado: row.estado,
      inspeccionados: ev.inspeccionados,
      defectuosos: ev.defectuosos,
      tasaDefecto: ev.tasaDefecto,
      requiereTotal: ev.requiereTotal || row.estado === ControlLoteEstado.REQUIERE_TOTAL,
      inspecciones: row.inspecciones.map((ins) => ({
        id: ins.id,
        kitInstanciaId: ins.kitInstanciaId,
        kitCodigo: ins.kitInstancia.codigo,
        resultado: ins.resultado,
        observaciones: ins.observaciones,
        items: ins.kitInstancia.items.map((item) => ({
          id: item.id,
          productoId: item.productoId,
          productoNombre: item.producto.nombre,
          inventoryItemId: item.inventoryItemId,
          loteCodigo: item.loteCodigo,
          vencimiento: item.vencimiento ? item.vencimiento.toISOString().slice(0, 10) : null,
          cantidad: Number(item.cantidad),
        })),
      })),
    };
  }

  private toConsolidacionDto(row: {
    id: string;
    codigo: string;
    demandaId: string;
    destinoNombre: string;
    estado: ConsolidacionDto['estado'];
    kitPesoKg: Prisma.Decimal;
    palletPesoMaxKg: Prisma.Decimal;
    kitAltoM: Prisma.Decimal | null;
    palletAltoMaxM: Prisma.Decimal | null;
    demanda: { codigo: string };
    kits: Array<{ id: string }>;
  }): ConsolidacionDto {
    const n = row.kits.length;
    const propuesta = proponerPallets({
      nKits: n,
      kitPesoKg: Number(row.kitPesoKg),
      palletPesoMaxKg: Number(row.palletPesoMaxKg),
      kitAltoM: row.kitAltoM ? Number(row.kitAltoM) : null,
      palletAltoMaxM: row.palletAltoMaxM ? Number(row.palletAltoMaxM) : null,
    });
    return {
      id: row.id,
      codigo: row.codigo,
      demandaId: row.demandaId,
      demandaCodigo: row.demanda.codigo,
      destinoNombre: row.destinoNombre,
      estado: row.estado,
      kitPesoKg: Number(row.kitPesoKg),
      palletPesoMaxKg: Number(row.palletPesoMaxKg),
      kitAltoM: row.kitAltoM ? Number(row.kitAltoM) : null,
      palletAltoMaxM: row.palletAltoMaxM ? Number(row.palletAltoMaxM) : null,
      kits: n,
      propuesta,
    };
  }
}

const INSTANCIA_INCLUDE = {
  kit: { select: { nombre: true } },
  zonaKitting: { select: { codigo: true } },
  items: {
    include: {
      producto: { select: { nombre: true } },
      origenUbicacion: { select: { codigo: true } },
    },
  },
} satisfies Prisma.KitInstanciaInclude;

const CONTROL_INCLUDE = {
  inspecciones: {
    include: {
      kitInstancia: {
        select: {
          codigo: true,
          items: { include: { producto: { select: { nombre: true } } } },
        },
      },
    },
  },
} satisfies Prisma.ControlLoteInclude;
