import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CargaEstado,
  ConsolidacionEstado,
  DespachoEstado,
  InventoryMovimientoTipo,
  KitInstanciaEstado,
  PalletDespachoEstado,
  PalletDespachoItemTipo,
  PlanPalletizacionEstado,
  Prisma,
  TransportEventTipo,
  ViajeEstado,
  ViajeParadaEstado,
} from '@prisma/client';
import { blankToNull } from '../common/soft-delete';
import { proponerPallets } from '../consolidacion/packing';
import { OrgCountersService } from '../org-counters/org-counters.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransporteService } from '../transporte/transporte.service';
import type {
  ActualizarChecklistDto,
  CargarPalletDto,
  CrearDespachoDto,
  CrearViajeDto,
  DespachoDto,
  EscanearKitDto,
  FinalizarPalletDto,
  PalletDespachoDto,
  PlanPalletizacionDto,
  RetirarKitDto,
} from './dto/despacho.dto';

/**
 * Las transacciones de palletización y salida escriben una fila por pallet y
 * varias por línea de kit, así que su duración crece con el tamaño del
 * despacho. Los 5 s por defecto de Prisma alcanzan para un despacho de prueba
 * y no para uno real: al pasarse, la transacción revierte entera y la salida
 * se cae en el momento en que el camión ya está cargado. `maxWait` sube junto
 * con el timeout porque si no, con varias salidas a la vez, la espera por una
 * conexión libre agota su propio límite antes de empezar.
 */
const TX_LARGA = { timeout: 120_000, maxWait: 15_000 } as const;

const DESPACHO_INCLUDE = {
  plan: { select: { codigo: true } },
  acopio: { select: { nombre: true } },
  demanda: { select: { codigo: true, prioridad: true } },
  pallets: {
    where: { isActive: true },
    select: {
      id: true,
      codigo: true,
      sequence: true,
      estado: true,
      pesoBrutoKg: true,
      items: { where: { isActive: true, retiradoAt: null } },
    },
    orderBy: { sequence: 'asc' as const },
  },
  viajes: {
    where: { isActive: true },
    include: {
      carga: {
        include: {
          items: {
            where: { isActive: true },
            include: { palletDespacho: { select: { codigo: true, estado: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  manifiesto: true,
  checklist: true,
} satisfies Prisma.DespachoInclude;

const PALLET_INCLUDE = {
  items: {
    where: { isActive: true },
    include: { kitInstancia: { select: { codigo: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.PalletDespachoInclude;

const PLAN_INCLUDE = {
  consolidacion: { select: { codigo: true } },
  slots: {
    where: { isActive: true },
    orderBy: { sequence: 'asc' as const },
    include: {
      pallet: {
        select: {
          id: true,
          codigo: true,
          estado: true,
          items: { where: { isActive: true, retiradoAt: null } },
        },
      },
    },
  },
  pallets: {
    where: { isActive: true },
    select: { id: true, estado: true },
  },
} satisfies Prisma.PlanPalletizacionInclude;

@Injectable()
export class DespachoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: OrgCountersService,
    private readonly transporte: TransporteService,
  ) {}

  async crearPlanDesdeConsolidacion(
    orgId: string,
    usuarioId: string,
    consolidacionId: string,
  ): Promise<PlanPalletizacionDto> {
    const consolidacion = await this.prisma.consolidacion.findFirst({
      where: { id: consolidacionId, organizationId: orgId, isActive: true },
      include: {
        kits: { where: { isActive: true } },
        planPalletizacion: true,
      },
    });
    if (!consolidacion) {
      throw new NotFoundException('Consolidación no encontrada');
    }
    if (consolidacion.planPalletizacion) {
      throw new BadRequestException('Esta consolidación ya tiene un plan de palletización');
    }
    const nKits = consolidacion.kits.length;
    if (nKits === 0) {
      throw new BadRequestException('La consolidación no tiene kits');
    }
    const propuesta = proponerPallets({
      nKits,
      kitPesoKg: Number(consolidacion.kitPesoKg),
      palletPesoMaxKg: Number(consolidacion.palletPesoMaxKg),
      kitAltoM: consolidacion.kitAltoM ? Number(consolidacion.kitAltoM) : null,
      palletAltoMaxM: consolidacion.palletAltoMaxM ? Number(consolidacion.palletAltoMaxM) : null,
    });
    // Los slots son cálculo puro sobre la propuesta y los códigos son un viaje
    // a la base: los dos van antes de abrir la transacción, no dentro.
    const slots: Array<{ sequence: number; kitsObjetivo: number; pesoTeoricoKg: number }> = [];
    for (let i = 0; i < propuesta.pallets; i++) {
      const kitsObjetivo =
        i === propuesta.pallets - 1 ? propuesta.ultimoPalletKits : propuesta.kitsPorPallet;
      slots.push({
        sequence: i + 1,
        kitsObjetivo,
        pesoTeoricoKg: kitsObjetivo * Number(consolidacion.kitPesoKg),
      });
    }
    const codigoPlan = await this.counters.codigoPlanPalletizacion(orgId);
    const codigosPallet = await this.counters.codigosPalletDespacho(orgId, slots.length);
    const planId = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.planPalletizacion.create({
        data: {
          codigo: codigoPlan,
          organizationId: orgId,
          acopioId: consolidacion.acopioId,
          demandaId: consolidacion.demandaId,
          consolidacionId: consolidacion.id,
          destinoNombre: consolidacion.destinoNombre,
          estado: PlanPalletizacionEstado.ACTIVO,
          kitPesoKg: consolidacion.kitPesoKg,
          palletPesoMaxKg: consolidacion.palletPesoMaxKg,
          kitAltoM: consolidacion.kitAltoM,
          palletAltoMaxM: consolidacion.palletAltoMaxM,
          palletCount: propuesta.pallets,
          kitsPorPallet: propuesta.kitsPorPallet,
          createdById: usuarioId,
          isActive: true,
        },
      });
      for (const [i, slot] of slots.entries()) {
        const slotRow = await tx.planPalletSlot.create({
          data: {
            planId: plan.id,
            sequence: slot.sequence,
            kitsObjetivo: slot.kitsObjetivo,
            pesoTeoricoKg: new Prisma.Decimal(slot.pesoTeoricoKg),
            isActive: true,
          },
        });
        await tx.palletDespacho.create({
          data: {
            codigo: codigosPallet[i],
            organizationId: orgId,
            acopioId: consolidacion.acopioId,
            demandaId: consolidacion.demandaId,
            planId: plan.id,
            slotId: slotRow.id,
            consolidacionId: consolidacion.id,
            destinoNombre: consolidacion.destinoNombre,
            sequence: slot.sequence,
            estado: PalletDespachoEstado.CREADO,
            kitsObjetivo: slot.kitsObjetivo,
            createdById: usuarioId,
            isActive: true,
          },
        });
      }
      await tx.consolidacion.update({
        where: { id: consolidacion.id },
        data: { estado: ConsolidacionEstado.LISTA },
      });
      return plan.id;
    }, TX_LARGA);
    return this.getPlan(orgId, planId);
  }

  async getPlan(orgId: string, id: string): Promise<PlanPalletizacionDto> {
    const row = await this.prisma.planPalletizacion.findFirst({
      where: { id, organizationId: orgId },
      include: PLAN_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Plan de palletización no encontrado');
    }
    return this.toPlanDto(row);
  }

  async listPlanesPorDemanda(orgId: string, demandaId: string): Promise<PlanPalletizacionDto[]> {
    const rows = await this.prisma.planPalletizacion.findMany({
      where: { organizationId: orgId, demandaId, isActive: true },
      include: PLAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toPlanDto(row));
  }

  async getPallet(orgId: string, id: string): Promise<PalletDespachoDto> {
    const row = await this.prisma.palletDespacho.findFirst({
      where: { id, organizationId: orgId },
      include: PALLET_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Pallet no encontrado');
    }
    return this.toPalletDto(row);
  }

  async getPalletByCodigo(orgId: string, codigo: string): Promise<PalletDespachoDto> {
    const row = await this.prisma.palletDespacho.findFirst({
      where: { organizationId: orgId, codigo: { equals: codigo.trim(), mode: 'insensitive' } },
      include: PALLET_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Pallet no encontrado');
    }
    return this.toPalletDto(row);
  }

  async listPalletsPlan(orgId: string, planId: string): Promise<PalletDespachoDto[]> {
    await this.requirePlan(orgId, planId);
    const rows = await this.prisma.palletDespacho.findMany({
      where: { planId, organizationId: orgId, isActive: true },
      include: PALLET_INCLUDE,
      orderBy: { sequence: 'asc' },
    });
    return rows.map((row) => this.toPalletDto(row));
  }

  async iniciarPallet(orgId: string, id: string): Promise<PalletDespachoDto> {
    const pallet = await this.requirePallet(orgId, id);
    if (
      pallet.estado !== PalletDespachoEstado.CREADO &&
      pallet.estado !== PalletDespachoEstado.EN_CONSTRUCCION
    ) {
      throw new BadRequestException('Este pallet no puede iniciarse en su estado actual');
    }
    await this.prisma.palletDespacho.update({
      where: { id },
      data: { estado: PalletDespachoEstado.EN_CONSTRUCCION },
    });
    return this.getPallet(orgId, id);
  }

  async escanearKit(
    orgId: string,
    usuarioId: string,
    palletId: string,
    dto: EscanearKitDto,
  ): Promise<PalletDespachoDto> {
    const pallet = await this.requirePallet(orgId, palletId);
    if (
      pallet.estado !== PalletDespachoEstado.EN_CONSTRUCCION &&
      pallet.estado !== PalletDespachoEstado.CREADO
    ) {
      throw new BadRequestException('Este pallet no acepta kits en su estado actual');
    }
    const kit = await this.prisma.kitInstancia.findFirst({
      where: {
        organizationId: orgId,
        codigo: { equals: dto.codigoKit.trim(), mode: 'insensitive' },
        isActive: true,
      },
      include: {
        consolidacionKits: { where: { isActive: true }, take: 1 },
      },
    });
    if (!kit) {
      throw new BadRequestException('Kit no encontrado');
    }
    if (
      kit.estado !== KitInstanciaEstado.CONSOLIDADO &&
      kit.estado !== KitInstanciaEstado.PALLETIZADO
    ) {
      throw new BadRequestException('Este kit no está aprobado para despacho');
    }
    if (kit.demandaId !== pallet.demandaId) {
      throw new BadRequestException('Este kit pertenece a otra demanda');
    }
    const enConsolidacion = kit.consolidacionKits[0];
    if (!enConsolidacion || enConsolidacion.consolidacionId !== pallet.consolidacionId) {
      throw new BadRequestException('Este kit no pertenece a la consolidación del pallet');
    }
    const yaEnPallet = await this.prisma.palletDespachoItem.findFirst({
      where: {
        kitInstanciaId: kit.id,
        isActive: true,
        retiradoAt: null,
        palletDespacho: { isActive: true, estado: { not: PalletDespachoEstado.CANCELADO } },
      },
    });
    if (yaEnPallet && yaEnPallet.palletDespachoId !== palletId) {
      throw new BadRequestException('Este kit ya está en otro pallet');
    }
    const activos = pallet.items.filter((item) => !item.retiradoAt);
    if (activos.length >= pallet.kitsObjetivo) {
      throw new BadRequestException('El pallet ya alcanzó la cantidad objetivo de kits');
    }
    const plan = await this.prisma.planPalletizacion.findFirst({
      where: { id: pallet.planId },
    });
    const pesoKit = plan ? Number(plan.kitPesoKg) : 20;
    const pesoMax = plan ? Number(plan.palletPesoMaxKg) : 800;
    const pesoTara = Number(pallet.pesoPalletKg);
    const pesoActual = activos.length * pesoKit;
    if (pesoActual + pesoKit + pesoTara > pesoMax) {
      throw new BadRequestException('Se supera el peso máximo permitido del pallet');
    }
    await this.prisma.$transaction(async (tx) => {
      if (pallet.estado === PalletDespachoEstado.CREADO) {
        await tx.palletDespacho.update({
          where: { id: palletId },
          data: { estado: PalletDespachoEstado.EN_CONSTRUCCION },
        });
      }
      const existente = await tx.palletDespachoItem.findFirst({
        where: { palletDespachoId: palletId, kitInstanciaId: kit.id, isActive: true },
      });
      if (!existente) {
        await tx.palletDespachoItem.create({
          data: {
            palletDespachoId: palletId,
            tipo: PalletDespachoItemTipo.KIT,
            kitInstanciaId: kit.id,
            escaneadoAt: new Date(),
            escaneadoPorId: usuarioId,
            isActive: true,
          },
        });
      } else if (existente.retiradoAt) {
        await tx.palletDespachoItem.update({
          where: { id: existente.id },
          data: {
            retiradoAt: null,
            retiradoMotivo: null,
            escaneadoAt: new Date(),
            escaneadoPorId: usuarioId,
          },
        });
      }
      await tx.kitInstancia.update({
        where: { id: kit.id },
        data: { estado: KitInstanciaEstado.PALLETIZADO },
      });
    });
    return this.getPallet(orgId, palletId);
  }

  async retirarKit(
    orgId: string,
    palletId: string,
    dto: RetirarKitDto,
  ): Promise<PalletDespachoDto> {
    const pallet = await this.requirePallet(orgId, palletId);
    const kit = await this.prisma.kitInstancia.findFirst({
      where: {
        organizationId: orgId,
        codigo: { equals: dto.codigoKit.trim(), mode: 'insensitive' },
      },
    });
    if (!kit) {
      throw new BadRequestException('Kit no encontrado');
    }
    const item = pallet.items.find((row) => row.kitInstanciaId === kit.id && !row.retiradoAt);
    if (!item) {
      throw new BadRequestException('Este kit no está activo en el pallet');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.palletDespachoItem.update({
        where: { id: item.id },
        data: {
          retiradoAt: new Date(),
          retiradoMotivo: blankToNull(dto.motivo),
        },
      });
      await tx.kitInstancia.update({
        where: { id: kit.id },
        data: { estado: KitInstanciaEstado.RECHAZADO },
      });
      if (
        pallet.estado === PalletDespachoEstado.COMPLETO ||
        pallet.estado === PalletDespachoEstado.LISTO_PARA_DESPACHO
      ) {
        await tx.palletDespacho.update({
          where: { id: palletId },
          data: { estado: PalletDespachoEstado.EN_CONSTRUCCION, finalizadoAt: null },
        });
      }
    });
    return this.getPallet(orgId, palletId);
  }

  async finalizarPallet(
    orgId: string,
    palletId: string,
    dto: FinalizarPalletDto,
  ): Promise<PalletDespachoDto> {
    const pallet = await this.requirePallet(orgId, palletId);
    const activos = pallet.items.filter((item) => !item.retiradoAt);
    if (activos.length === 0) {
      throw new BadRequestException('El pallet no tiene kits cargados');
    }
    if (
      pallet.estado !== PalletDespachoEstado.EN_CONSTRUCCION &&
      pallet.estado !== PalletDespachoEstado.CREADO
    ) {
      throw new BadRequestException('Este pallet no puede finalizarse en su estado actual');
    }
    const tara = dto.pesoPalletKg ?? Number(pallet.pesoPalletKg);
    const neto = dto.pesoBrutoKg - tara;
    if (neto <= 0) {
      throw new BadRequestException('El peso neto debe ser positivo');
    }
    await this.prisma.palletDespacho.update({
      where: { id: palletId },
      data: {
        estado: PalletDespachoEstado.COMPLETO,
        pesoPalletKg: new Prisma.Decimal(tara),
        pesoNetoKg: new Prisma.Decimal(neto),
        pesoBrutoKg: new Prisma.Decimal(dto.pesoBrutoKg),
        altoM: new Prisma.Decimal(dto.altoM),
        anchoM: new Prisma.Decimal(dto.anchoM),
        largoM: new Prisma.Decimal(dto.largoM),
        finalizadoAt: new Date(),
      },
    });
    return this.getPallet(orgId, palletId);
  }

  async marcarPalletListo(orgId: string, palletId: string): Promise<PalletDespachoDto> {
    const pallet = await this.requirePallet(orgId, palletId);
    if (pallet.estado !== PalletDespachoEstado.COMPLETO) {
      throw new BadRequestException('Solo pallets completos pueden marcarse listos para despacho');
    }
    await this.prisma.palletDespacho.update({
      where: { id: palletId },
      data: { estado: PalletDespachoEstado.LISTO_PARA_DESPACHO },
    });
    return this.getPallet(orgId, palletId);
  }

  async crearDespacho(
    orgId: string,
    usuarioId: string,
    planId: string,
    dto: CrearDespachoDto,
  ): Promise<DespachoDto> {
    const plan = await this.requirePlan(orgId, planId);
    const kitsEsperados = await this.prisma.palletDespacho.aggregate({
      where: { planId, isActive: true },
      _sum: { kitsObjetivo: true },
    });
    const codigo = await this.counters.codigoDespacho(orgId);
    const id = await this.prisma.$transaction(async (tx) => {
      const row = await tx.despacho.create({
        data: {
          codigo,
          organizationId: orgId,
          acopioId: plan.acopioId,
          demandaId: plan.demandaId,
          planId: plan.id,
          destinoNombre: plan.destinoNombre,
          estado: DespachoEstado.BORRADOR,
          palletsEsperados: plan.palletCount,
          kitsEsperados: kitsEsperados._sum.kitsObjetivo ?? 0,
          observaciones: blankToNull(dto.observaciones ?? ''),
          salidaProgramada: dto.salidaProgramada ? new Date(dto.salidaProgramada) : null,
          createdById: usuarioId,
          isActive: true,
        },
      });
      await tx.despachoChecklist.create({ data: { despachoId: row.id } });
      return row.id;
    });
    return this.getDespacho(orgId, id);
  }

  async planificarDespacho(orgId: string, despachoId: string): Promise<DespachoDto> {
    const despacho = await this.requireDespacho(orgId, despachoId);
    if (despacho.estado !== DespachoEstado.BORRADOR) {
      throw new BadRequestException('Solo despachos en borrador pueden planificarse');
    }
    const listos = await this.prisma.palletDespacho.count({
      where: {
        planId: despacho.planId,
        isActive: true,
        estado: PalletDespachoEstado.LISTO_PARA_DESPACHO,
      },
    });
    if (listos === 0) {
      throw new BadRequestException('No hay pallets listos para despacho');
    }
    await this.prisma.despacho.update({
      where: { id: despachoId },
      data: { estado: DespachoEstado.PLANIFICADO },
    });
    return this.getDespacho(orgId, despachoId);
  }

  async crearViaje(
    orgId: string,
    usuarioId: string,
    despachoId: string,
    dto: CrearViajeDto,
  ): Promise<DespachoDto> {
    const despacho = await this.requireDespacho(orgId, despachoId);
    if (
      despacho.estado !== DespachoEstado.PLANIFICADO &&
      despacho.estado !== DespachoEstado.LISTO_PARA_CARGA &&
      despacho.estado !== DespachoEstado.PARCIAL
    ) {
      throw new BadRequestException('El despacho no acepta viajes en su estado actual');
    }
    const palletsPendientes = await this.palletsPendientesCarga(orgId, despacho.planId, despachoId);
    if (palletsPendientes === 0) {
      throw new BadRequestException('No quedan pallets pendientes de carga');
    }
    const palletsAsignar = dto.palletsEsperados ?? palletsPendientes;
    const vehiculo = await this.resolveVehiculo(orgId, dto);
    const pesoEstimado = await this.pesoPalletsListos(orgId, despacho.planId, palletsAsignar);
    if (vehiculo?.capacidadKg && pesoEstimado > Number(vehiculo.capacidadKg)) {
      throw new BadRequestException(
        `La carga estimada (${pesoEstimado} kg) excede la capacidad del vehículo (${Number(vehiculo.capacidadKg)} kg)`,
      );
    }
    const transportista = dto.transportistaId
      ? await this.prisma.transportista.findFirst({
          where: { id: dto.transportistaId, organizationId: orgId, isActive: true },
        })
      : null;
    const conductor = dto.conductorId
      ? await this.prisma.conductor.findFirst({
          where: { id: dto.conductorId, organizationId: orgId, isActive: true },
        })
      : null;
    const codigoViaje = await this.counters.codigoViaje(orgId);
    const acopio = await this.prisma.acopio.findUnique({
      where: { id: despacho.acopioId },
      select: { nombre: true },
    });
    const kitsViaje = await this.kitsEnPalletsPendientes(orgId, despacho.planId, palletsAsignar);
    await this.prisma.$transaction(async (tx) => {
      const viaje = await tx.viaje.create({
        data: {
          codigo: codigoViaje,
          organizationId: orgId,
          acopioId: despacho.acopioId,
          despachoId,
          vehiculoId: vehiculo?.id,
          transportistaId: transportista?.id,
          conductorId: conductor?.id,
          vehiculoPlaca: vehiculo?.placa ?? blankToNull(dto.vehiculoPlaca ?? ''),
          transportistaNombre: transportista?.nombre ?? blankToNull(dto.transportista ?? ''),
          conductorNombre: conductor?.nombre ?? blankToNull(dto.conductorNombre ?? ''),
          conductorDocumento: conductor?.documento ?? blankToNull(dto.conductorDocumento ?? ''),
          origenNombre: acopio?.nombre ?? 'Centro de acopio',
          destinoNombre: despacho.destinoNombre,
          estado: vehiculo ? ViajeEstado.ASIGNADO : ViajeEstado.PLANIFICADO,
          palletsEsperados: palletsAsignar,
          kitsEsperados: kitsViaje,
          salidaProgramada: despacho.salidaProgramada,
          createdById: usuarioId,
          isActive: true,
        },
      });
      await tx.carga.create({
        data: {
          viajeId: viaje.id,
          despachoId,
          estado: CargaEstado.ABIERTA,
          palletsEsperados: palletsAsignar,
          isActive: true,
        },
      });
      await tx.despacho.update({
        where: { id: despachoId },
        data: { estado: DespachoEstado.LISTO_PARA_CARGA },
      });
    });
    return this.getDespacho(orgId, despachoId);
  }

  async getDespacho(orgId: string, id: string): Promise<DespachoDto> {
    const row = await this.prisma.despacho.findFirst({
      where: { id, organizationId: orgId },
      include: DESPACHO_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Despacho no encontrado');
    }
    return this.toDespachoDto(row);
  }

  async listDespachosDemanda(orgId: string, demandaId: string): Promise<DespachoDto[]> {
    const rows = await this.prisma.despacho.findMany({
      where: { organizationId: orgId, demandaId, isActive: true },
      include: DESPACHO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDespachoDto(row));
  }

  async listDespachosOrg(orgId: string): Promise<DespachoDto[]> {
    const rows = await this.prisma.despacho.findMany({
      where: { organizationId: orgId, isActive: true },
      include: DESPACHO_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.toDespachoDto(row));
  }

  async iniciarCarga(orgId: string, despachoId: string, viajeId?: string): Promise<DespachoDto> {
    const viaje = await this.requireViajeActivo(orgId, despachoId, viajeId);
    await this.prisma.$transaction(async (tx) => {
      await tx.viaje.update({ where: { id: viaje.id }, data: { estado: ViajeEstado.CARGANDO } });
      if (viaje.carga) {
        await tx.carga.update({
          where: { id: viaje.carga.id },
          data: { estado: CargaEstado.CARGANDO },
        });
      }
      await tx.despacho.update({
        where: { id: despachoId },
        data: { estado: DespachoEstado.CARGANDO },
      });
    });
    return this.getDespacho(orgId, despachoId);
  }

  async cargarPallet(
    orgId: string,
    usuarioId: string,
    despachoId: string,
    dto: CargarPalletDto,
  ): Promise<DespachoDto> {
    const despacho = await this.requireDespacho(orgId, despachoId);
    const viaje = await this.requireViajeActivo(orgId, despachoId, dto.viajeId);
    const carga = viaje.carga;
    if (!carga) {
      throw new BadRequestException('El viaje no tiene carga asociada');
    }
    const pallet = await this.prisma.palletDespacho.findFirst({
      where: {
        organizationId: orgId,
        codigo: { equals: dto.codigoPallet.trim(), mode: 'insensitive' },
        isActive: true,
      },
      include: {
        items: { where: { isActive: true, retiradoAt: null } },
      },
    });
    if (!pallet) {
      throw new BadRequestException('Pallet no encontrado');
    }
    if (pallet.planId !== despacho.planId) {
      throw new BadRequestException('Este pallet no pertenece al plan del despacho');
    }
    if (pallet.estado !== PalletDespachoEstado.LISTO_PARA_DESPACHO) {
      throw new BadRequestException('El pallet no está listo para despacho');
    }
    if (pallet.despachoId && pallet.despachoId !== despachoId) {
      throw new BadRequestException('Este pallet ya está asignado a otro despacho');
    }
    const yaCargado = await this.prisma.cargaItem.findFirst({
      where: { palletDespachoId: pallet.id, isActive: true },
    });
    if (yaCargado) {
      throw new BadRequestException('Este pallet ya fue cargado');
    }
    const cargados = carga.items.length;
    if (cargados >= carga.palletsEsperados) {
      throw new BadRequestException('La carga del viaje ya está completa');
    }
    const pesoNuevo = Number(pallet.pesoBrutoKg ?? 0);
    if (viaje.vehiculoId) {
      const veh = await this.prisma.vehiculo.findUnique({ where: { id: viaje.vehiculoId } });
      if (veh?.capacidadKg && Number(viaje.pesoCargadoKg) + pesoNuevo > Number(veh.capacidadKg)) {
        throw new BadRequestException('Se supera la capacidad del vehículo');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      if (viaje.estado === ViajeEstado.PLANIFICADO) {
        await tx.viaje.update({ where: { id: viaje.id }, data: { estado: ViajeEstado.CARGANDO } });
        await tx.carga.update({ where: { id: carga.id }, data: { estado: CargaEstado.CARGANDO } });
        await tx.despacho.update({
          where: { id: despachoId },
          data: { estado: DespachoEstado.CARGANDO },
        });
      }
      await tx.cargaItem.create({
        data: {
          cargaId: carga.id,
          palletDespachoId: pallet.id,
          escaneadoAt: new Date(),
          escaneadoPorId: usuarioId,
          isActive: true,
        },
      });
      await tx.palletDespacho.update({
        where: { id: pallet.id },
        data: { despachoId, estado: PalletDespachoEstado.CARGADO },
      });
      await tx.viaje.update({
        where: { id: viaje.id },
        data: {
          palletsCargados: { increment: 1 },
          kitsCargados: { increment: pallet.items.length },
          pesoCargadoKg: { increment: pesoNuevo },
        },
      });
    });
    return this.getDespacho(orgId, despachoId);
  }

  async verificarCarga(
    orgId: string,
    despachoId: string,
    opts?: { permitirParcial?: boolean },
  ): Promise<DespachoDto> {
    const despacho = await this.getDespacho(orgId, despachoId);
    const viajeActivo = despacho.viajes?.find(
      (v) => v.estado === ViajeEstado.CARGANDO || v.estado === ViajeEstado.PLANIFICADO,
    );
    if (!viajeActivo) {
      throw new BadRequestException('No hay un viaje en carga');
    }
    const cargados = viajeActivo.palletsCargados;
    if (cargados === 0) {
      throw new BadRequestException('No se cargó ningún pallet');
    }
    if (cargados < viajeActivo.palletsEsperados && !opts?.permitirParcial) {
      throw new BadRequestException(
        `Faltan ${viajeActivo.palletsEsperados - cargados} pallet(s). Usá permitirParcial para cerrar incompleto.`,
      );
    }
    const acopio = await this.prisma.acopio.findUnique({
      where: { id: despacho.acopioId ?? '' },
      select: { nombre: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.viaje.update({
        where: { id: viajeActivo.id },
        data: { estado: ViajeEstado.CARGADO },
      });
      const cargaRow = await tx.carga.findUnique({ where: { viajeId: viajeActivo.id } });
      if (cargaRow) {
        await tx.carga.update({
          where: { id: cargaRow.id },
          data: {
            estado:
              cargados >= cargaRow.palletsEsperados ? CargaEstado.COMPLETA : CargaEstado.CARGANDO,
          },
        });
      }
      const esParcial = cargados < despacho.palletsEsperados;
      await tx.despacho.update({
        where: { id: despachoId },
        data: {
          estado: esParcial ? DespachoEstado.PARCIAL : DespachoEstado.CARGADO,
          esParcial,
          pesoTotalKg: new Prisma.Decimal(despacho.pesoTotalKg),
        },
      });
      await tx.despachoManifiesto.upsert({
        where: { despachoId },
        create: {
          despachoId,
          origenNombre: acopio?.nombre ?? 'Centro de acopio',
          destinoNombre: despacho.destinoNombre,
          vehiculoPlaca: viajeActivo.vehiculoPlaca,
          conductorNombre: viajeActivo.conductorNombre,
          transportistaNombre: viajeActivo.transportistaNombre,
          palletsCount: cargados,
          kitsCount: despacho.kitsCargados,
          pesoKg: new Prisma.Decimal(despacho.pesoTotalKg),
        },
        update: {
          palletsCount: cargados,
          kitsCount: despacho.kitsCargados,
          pesoKg: new Prisma.Decimal(despacho.pesoTotalKg),
          generadoAt: new Date(),
        },
      });
    });
    return this.getDespacho(orgId, despachoId);
  }

  async completarCarga(orgId: string, despachoId: string): Promise<DespachoDto> {
    return this.verificarCarga(orgId, despachoId, { permitirParcial: false });
  }

  async actualizarChecklist(
    orgId: string,
    despachoId: string,
    dto: ActualizarChecklistDto,
  ): Promise<DespachoDto> {
    await this.requireDespacho(orgId, despachoId);
    await this.prisma.despachoChecklist.upsert({
      where: { despachoId },
      create: { despachoId, ...dto },
      update: dto,
    });
    return this.getDespacho(orgId, despachoId);
  }

  async confirmarSalida(
    orgId: string,
    usuarioId: string,
    despachoId: string,
    opts?: { permitirParcial?: boolean },
  ): Promise<DespachoDto> {
    const despacho = await this.getDespacho(orgId, despachoId);
    if (despacho.estado !== DespachoEstado.CARGADO && despacho.estado !== DespachoEstado.PARCIAL) {
      throw new BadRequestException('Verificá la carga antes de confirmar salida');
    }
    const checklist = despacho.checklist;
    if (
      !checklist?.cargaCompleta ||
      !checklist.destinoConfirmado ||
      !checklist.vehiculoConfirmado
    ) {
      throw new BadRequestException('Completá el checklist de salida antes de confirmar');
    }
    if (despacho.palletsCargados === 0) {
      throw new BadRequestException('No hay pallets cargados');
    }
    if (despacho.palletsCargados < despacho.palletsEsperados && !opts?.permitirParcial) {
      throw new BadRequestException(
        'Despacho incompleto. Usá permitirParcial para salida parcial.',
      );
    }
    const pallets = await this.prisma.palletDespacho.findMany({
      where: { despachoId, isActive: true, estado: PalletDespachoEstado.CARGADO },
      include: {
        items: {
          where: { isActive: true, retiradoAt: null },
          include: {
            kitInstancia: {
              include: {
                items: { where: { isActive: true, pickConfirmadoAt: { not: null } } },
              },
            },
          },
        },
      },
    });
    const kitsDespachados = pallets.reduce((sum, p) => sum + p.items.length, 0);
    const viajesSalida = await this.prisma.viaje.findMany({
      where: { despachoId, isActive: true, estado: ViajeEstado.CARGADO },
      include: {
        carga: {
          include: {
            items: {
              where: { isActive: true },
              include: { palletDespacho: true },
            },
          },
        },
      },
    });
    const salidaAt = new Date();
    // Se aplana antes de abrir la transacción: decidir qué líneas mueven stock
    // es filtrado puro sobre lo que ya se leyó, y saber cuántas son es lo que
    // permite reservar los códigos de movimiento de una sola vez.
    const movimientos = pallets.flatMap((pallet) =>
      pallet.items.flatMap((item) => {
        const kit = item.kitInstancia;
        if (!kit) {
          return [];
        }
        return kit.items.flatMap((linea) => {
          if (!linea.inventoryItemId || !linea.pickConfirmadoAt) {
            return [];
          }
          const ubicacionId = kit.zonaKittingUbicacionId ?? linea.origenUbicacionId;
          if (!ubicacionId) {
            return [];
          }
          return [{ linea, inventoryItemId: linea.inventoryItemId, ubicacionId }];
        });
      }),
    );
    const kitInstanciaIds = [
      ...new Set(
        pallets.flatMap((p) => p.items.flatMap((i) => (i.kitInstancia ? [i.kitInstancia.id] : []))),
      ),
    ];
    const codigosMov = await this.counters.codigosMovimiento(orgId, movimientos.length);
    await this.prisma.$transaction(async (tx) => {
      for (const [i, mov] of movimientos.entries()) {
        const { linea, inventoryItemId, ubicacionId } = mov;
        await this.reducirSaldo(tx, inventoryItemId, ubicacionId, Number(linea.cantidad));
        await tx.inventoryMovimiento.create({
          data: {
            codigo: codigosMov[i],
            organizationId: orgId,
            acopioId: despacho.acopioId,
            inventoryItemId,
            tipo: InventoryMovimientoTipo.DESPACHO,
            cantidad: linea.cantidad,
            origenUbicacionId: ubicacionId,
            destinoUbicacionId: null,
            kitInstanciaItemId: linea.id,
            despachoId,
            usuarioId,
            observaciones: `Salida ${despacho.codigo}`,
            isActive: true,
          },
        });
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { cantidad: { decrement: linea.cantidad } },
        });
      }
      // Los estados no dependen de cada línea, así que van en dos updates
      // masivos en vez de uno por fila dentro del bucle.
      await tx.kitInstancia.updateMany({
        where: { id: { in: kitInstanciaIds } },
        data: { estado: KitInstanciaEstado.DESPACHADO },
      });
      await tx.palletDespacho.updateMany({
        where: { id: { in: pallets.map((p) => p.id) } },
        data: { estado: PalletDespachoEstado.DESPACHADO },
      });
      const esParcial = despacho.palletsCargados < despacho.palletsEsperados;
      await tx.despacho.update({
        where: { id: despachoId },
        data: {
          estado: esParcial ? DespachoEstado.PARCIAL : DespachoEstado.EN_TRANSITO,
          esParcial,
          palletsDespachados: despacho.palletsCargados,
          kitsDespachados,
          salidaReal: salidaAt,
        },
      });
      await tx.viaje.updateMany({
        where: { despachoId, estado: ViajeEstado.CARGADO },
        data: { estado: ViajeEstado.EN_TRANSITO, salidaReal: salidaAt },
      });
      for (const viaje of viajesSalida) {
        const paradasCount = await tx.viajeParada.count({
          where: { viajeId: viaje.id, isActive: true },
        });
        if (paradasCount === 0) {
          await tx.viajeParada.create({
            data: {
              viajeId: viaje.id,
              sequence: 1,
              nombre: viaje.destinoNombre ?? despacho.destinoNombre,
              destinoNombre: viaje.destinoNombre ?? despacho.destinoNombre,
              estado: ViajeParadaEstado.EN_RUTA,
              isActive: true,
            },
          });
        }
        await this.transporte.autoAsignarPalletsEnTransaccion(tx, viaje.id);
        await tx.transportEvent.create({
          data: {
            viajeId: viaje.id,
            tipo: TransportEventTipo.SALIDA,
            fechaHora: salidaAt,
            ubicacionNombre: viaje.origenNombre,
            observaciones: `Salida ${despacho.codigo}`,
            createdById: usuarioId,
            isActive: true,
          },
        });
      }
      await tx.despachoChecklist.update({
        where: { despachoId },
        data: { confirmadoAt: new Date(), confirmadoPorId: usuarioId },
      });
    }, TX_LARGA);
    return this.getDespacho(orgId, despachoId);
  }

  async despachar(orgId: string, despachoId: string, usuarioId: string): Promise<DespachoDto> {
    return this.confirmarSalida(orgId, usuarioId, despachoId, { permitirParcial: true });
  }

  private async requirePlan(orgId: string, id: string) {
    const row = await this.prisma.planPalletizacion.findFirst({
      where: { id, organizationId: orgId, isActive: true },
    });
    if (!row) {
      throw new NotFoundException('Plan de palletización no encontrado');
    }
    return row;
  }

  private async requirePallet(orgId: string, id: string) {
    const row = await this.prisma.palletDespacho.findFirst({
      where: { id, organizationId: orgId, isActive: true },
      include: PALLET_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Pallet no encontrado');
    }
    return row;
  }

  private async requireViajeActivo(orgId: string, despachoId: string, viajeId?: string) {
    const include = {
      carga: { include: { items: { where: { isActive: true } } } },
    } satisfies Prisma.ViajeInclude;
    if (viajeId) {
      const row = await this.prisma.viaje.findFirst({
        where: { id: viajeId, despachoId, organizationId: orgId, isActive: true },
        include,
      });
      if (!row) {
        throw new NotFoundException('Viaje no encontrado');
      }
      return row;
    }
    const row = await this.prisma.viaje.findFirst({
      where: {
        despachoId,
        organizationId: orgId,
        isActive: true,
        estado: { in: [ViajeEstado.PLANIFICADO, ViajeEstado.CARGANDO] },
      },
      include,
      orderBy: { createdAt: 'desc' },
    });
    if (!row) {
      throw new BadRequestException('Creá un viaje antes de cargar');
    }
    return row;
  }

  private async palletsPendientesCarga(orgId: string, planId: string, despachoId: string) {
    return this.prisma.palletDespacho.count({
      where: {
        organizationId: orgId,
        planId,
        isActive: true,
        estado: PalletDespachoEstado.LISTO_PARA_DESPACHO,
        OR: [{ despachoId: null }, { despachoId }],
      },
    });
  }

  private async pesoPalletsListos(orgId: string, planId: string, limit: number) {
    const rows = await this.prisma.palletDespacho.findMany({
      where: {
        organizationId: orgId,
        planId,
        isActive: true,
        estado: PalletDespachoEstado.LISTO_PARA_DESPACHO,
      },
      select: { pesoBrutoKg: true },
      take: limit,
    });
    return rows.reduce((sum, row) => sum + Number(row.pesoBrutoKg ?? 0), 0);
  }

  private async kitsEnPalletsPendientes(orgId: string, planId: string, limit: number) {
    const rows = await this.prisma.palletDespacho.findMany({
      where: {
        organizationId: orgId,
        planId,
        isActive: true,
        estado: PalletDespachoEstado.LISTO_PARA_DESPACHO,
      },
      select: { kitsObjetivo: true },
      take: limit,
    });
    return rows.reduce((sum, row) => sum + row.kitsObjetivo, 0);
  }

  private async resolveVehiculo(orgId: string, dto: CrearViajeDto) {
    if (dto.vehiculoId) {
      return this.prisma.vehiculo.findFirst({
        where: { id: dto.vehiculoId, organizationId: orgId, isActive: true },
      });
    }
    const placa = dto.vehiculoPlaca?.trim();
    if (!placa) {
      return null;
    }
    const existente = await this.prisma.vehiculo.findFirst({
      where: {
        organizationId: orgId,
        placa: { equals: placa, mode: 'insensitive' },
        isActive: true,
      },
    });
    if (existente) {
      return existente;
    }
    return this.prisma.vehiculo.create({
      data: {
        organizationId: orgId,
        placa: placa.toUpperCase(),
        tipo: blankToNull(dto.vehiculoTipo ?? ''),
        capacidadKg:
          dto.vehiculoCapacidadKg != null ? new Prisma.Decimal(dto.vehiculoCapacidadKg) : null,
        isActive: true,
      },
    });
  }

  private async reducirSaldo(
    tx: Prisma.TransactionClient,
    inventoryItemId: string,
    ubicacionId: string,
    cantidad: number,
  ) {
    const origen = await tx.inventoryBalance.findUnique({
      where: { inventoryItemId_ubicacionId: { inventoryItemId, ubicacionId } },
    });
    if (!origen || Number(origen.cantidad) + 0.001 < cantidad) {
      throw new BadRequestException('No hay stock suficiente en la ubicación de kitting');
    }
    const queda = Number(origen.cantidad) - cantidad;
    await tx.inventoryBalance.update({
      where: { id: origen.id },
      data: { cantidad: new Prisma.Decimal(queda), isActive: queda > 0.001 },
    });
  }

  private async requireDespacho(orgId: string, id: string) {
    const row = await this.prisma.despacho.findFirst({
      where: { id, organizationId: orgId, isActive: true },
    });
    if (!row) {
      throw new NotFoundException('Despacho no encontrado');
    }
    return row;
  }

  private toPlanDto(row: {
    id: string;
    codigo: string;
    consolidacionId: string;
    demandaId: string;
    destinoNombre: string;
    estado: PlanPalletizacionEstado;
    palletCount: number;
    kitsPorPallet: number;
    kitPesoKg: Prisma.Decimal;
    palletPesoMaxKg: Prisma.Decimal;
    consolidacion?: { codigo: string };
    slots: Array<{
      id: string;
      sequence: number;
      kitsObjetivo: number;
      pesoTeoricoKg: Prisma.Decimal;
      pallet?: {
        id: string;
        codigo: string;
        estado: PalletDespachoEstado;
        items: unknown[];
      } | null;
    }>;
    pallets: Array<{ estado: PalletDespachoEstado }>;
  }): PlanPalletizacionDto {
    const kitsTotal = row.slots.reduce((sum, slot) => sum + slot.kitsObjetivo, 0);
    const palletsListos = row.pallets.filter(
      (p) =>
        p.estado === PalletDespachoEstado.LISTO_PARA_DESPACHO ||
        p.estado === PalletDespachoEstado.CARGADO ||
        p.estado === PalletDespachoEstado.DESPACHADO,
    ).length;
    return {
      id: row.id,
      codigo: row.codigo,
      consolidacionId: row.consolidacionId,
      consolidacionCodigo: row.consolidacion?.codigo,
      demandaId: row.demandaId,
      destinoNombre: row.destinoNombre,
      estado: row.estado,
      palletCount: row.palletCount,
      kitsPorPallet: row.kitsPorPallet,
      kitPesoKg: Number(row.kitPesoKg),
      palletPesoMaxKg: Number(row.palletPesoMaxKg),
      kitsTotal,
      palletsListos,
      slots: row.slots.map((slot) => ({
        id: slot.id,
        sequence: slot.sequence,
        kitsObjetivo: slot.kitsObjetivo,
        pesoTeoricoKg: Number(slot.pesoTeoricoKg),
        palletId: slot.pallet?.id ?? null,
        palletCodigo: slot.pallet?.codigo ?? null,
        palletEstado: slot.pallet?.estado ?? null,
        kitsActual: slot.pallet?.items.length ?? 0,
      })),
    };
  }

  private toPalletDto(row: {
    id: string;
    codigo: string;
    planId: string;
    demandaId: string;
    destinoNombre: string;
    sequence: number;
    estado: PalletDespachoEstado;
    kitsObjetivo: number;
    pesoPalletKg: Prisma.Decimal;
    pesoNetoKg: Prisma.Decimal | null;
    pesoBrutoKg: Prisma.Decimal | null;
    altoM: Prisma.Decimal | null;
    anchoM: Prisma.Decimal | null;
    largoM: Prisma.Decimal | null;
    despachoId: string | null;
    items: Array<{
      id: string;
      kitInstanciaId: string | null;
      escaneadoAt: Date | null;
      retiradoAt: Date | null;
      retiradoMotivo: string | null;
      kitInstancia?: { codigo: string } | null;
    }>;
  }): PalletDespachoDto {
    const activos = row.items.filter((item) => !item.retiradoAt);
    return {
      id: row.id,
      codigo: row.codigo,
      planId: row.planId,
      demandaId: row.demandaId,
      destinoNombre: row.destinoNombre,
      sequence: row.sequence,
      estado: row.estado,
      kitsObjetivo: row.kitsObjetivo,
      kitsActual: activos.length,
      pesoPalletKg: Number(row.pesoPalletKg),
      pesoNetoKg: row.pesoNetoKg ? Number(row.pesoNetoKg) : null,
      pesoBrutoKg: row.pesoBrutoKg ? Number(row.pesoBrutoKg) : null,
      altoM: row.altoM ? Number(row.altoM) : null,
      anchoM: row.anchoM ? Number(row.anchoM) : null,
      largoM: row.largoM ? Number(row.largoM) : null,
      despachoId: row.despachoId,
      items: row.items.map((item) => ({
        id: item.id,
        kitInstanciaId: item.kitInstanciaId,
        kitCodigo: item.kitInstancia?.codigo ?? null,
        escaneadoAt: item.escaneadoAt?.toISOString() ?? null,
        retiradoAt: item.retiradoAt?.toISOString() ?? null,
        retiradoMotivo: item.retiradoMotivo,
      })),
    };
  }

  private toDespachoDto(
    row: Prisma.DespachoGetPayload<{ include: typeof DESPACHO_INCLUDE }>,
  ): DespachoDto {
    const cargados = row.pallets.filter(
      (p) =>
        p.estado === PalletDespachoEstado.CARGADO || p.estado === PalletDespachoEstado.DESPACHADO,
    );
    const kitsCargados = cargados.reduce((sum, p) => sum + p.items.length, 0);
    const pesoCalculado = cargados.reduce((sum, p) => sum + Number(p.pesoBrutoKg ?? 0), 0);
    const viajeReciente = row.viajes[row.viajes.length - 1];
    return {
      id: row.id,
      codigo: row.codigo,
      acopioId: row.acopioId,
      acopioNombre: row.acopio?.nombre,
      planId: row.planId,
      planCodigo: row.plan?.codigo,
      demandaId: row.demandaId,
      demandaCodigo: row.demanda?.codigo,
      destinoNombre: row.destinoNombre,
      estado: row.estado,
      palletsEsperados: row.palletsEsperados,
      palletsCargados: cargados.length,
      palletsDespachados: row.palletsDespachados,
      kitsEsperados: row.kitsEsperados,
      kitsCargados,
      kitsDespachados: row.kitsDespachados,
      pesoTotalKg: Number(row.pesoTotalKg ?? pesoCalculado),
      esParcial: row.esParcial,
      observaciones: row.observaciones,
      vehiculoPlaca: viajeReciente?.vehiculoPlaca ?? row.vehiculoPlaca,
      transportista: viajeReciente?.transportistaNombre ?? row.transportista,
      conductorNombre: viajeReciente?.conductorNombre ?? row.conductorNombre,
      conductorDocumento: viajeReciente?.conductorDocumento ?? row.conductorDocumento,
      documentoTransporte: row.documentoTransporte,
      salidaProgramada: row.salidaProgramada?.toISOString() ?? null,
      salidaReal: row.salidaReal?.toISOString() ?? null,
      viajes: row.viajes.map((viaje) => ({
        id: viaje.id,
        codigo: viaje.codigo,
        estado: viaje.estado,
        vehiculoPlaca: viaje.vehiculoPlaca,
        transportistaNombre: viaje.transportistaNombre,
        conductorNombre: viaje.conductorNombre,
        palletsEsperados: viaje.palletsEsperados,
        palletsCargados: viaje.palletsCargados,
        pesoCargadoKg: Number(viaje.pesoCargadoKg),
      })),
      checklist: row.checklist
        ? {
            cargaCompleta: row.checklist.cargaCompleta,
            palletsIdentificados: row.checklist.palletsIdentificados,
            pesoVerificado: row.checklist.pesoVerificado,
            destinoConfirmado: row.checklist.destinoConfirmado,
            vehiculoConfirmado: row.checklist.vehiculoConfirmado,
            conductorConfirmado: row.checklist.conductorConfirmado,
            documentacionCompleta: row.checklist.documentacionCompleta,
            sellosRegistrados: row.checklist.sellosRegistrados,
          }
        : null,
      manifiesto: row.manifiesto
        ? {
            origenNombre: row.manifiesto.origenNombre,
            destinoNombre: row.manifiesto.destinoNombre,
            vehiculoPlaca: row.manifiesto.vehiculoPlaca,
            conductorNombre: row.manifiesto.conductorNombre,
            transportistaNombre: row.manifiesto.transportistaNombre,
            palletsCount: row.manifiesto.palletsCount,
            kitsCount: row.manifiesto.kitsCount,
            pesoKg: Number(row.manifiesto.pesoKg),
            generadoAt: row.manifiesto.generadoAt.toISOString(),
          }
        : null,
      pallets: row.pallets.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        sequence: p.sequence,
        estado: p.estado,
      })),
    };
  }
}
