import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  TransportEventTipo,
  ViajeEstado,
  ViajeParadaEstado,
} from '@prisma/client';
import { blankToNull } from '../common/soft-delete';
import { OrgCountersService } from '../org-counters/org-counters.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AsignarPalletParadaDto,
  AutoAsignarResultDto,
  ConductorDto,
  CargaPalletDto,
  CrearConductorDto,
  CrearRutaDto,
  CrearTransportistaDto,
  CrearVehiculoDto,
  CrearViajeParadasDto,
  RegistrarTransportEventDto,
  RutaDto,
  TransportistaDto,
  TransportEventDto,
  VehiculoDto,
  ViajeDetalleDto,
  ViajeResumenTransporteDto,
} from './dto/transporte.dto';
import {
  autoAsignarPalletsEnViaje,
  contarPalletsSinAsignar,
} from './parada-asignacion';

const VIAJE_INCLUDE = {
  despacho: { select: { codigo: true } },
  paradas: {
    where: { isActive: true },
    orderBy: { sequence: 'asc' as const },
    include: {
      pallets: {
        where: { isActive: true },
        include: {
          palletDespacho: {
            select: {
              codigo: true,
              items: { where: { isActive: true, retiradoAt: null }, select: { id: true } },
            },
          },
        },
      },
    },
  },
  eventos: {
    where: { isActive: true },
    orderBy: { fechaHora: 'asc' as const },
  },
  pod: { select: { estado: true } },
} satisfies Prisma.ViajeInclude;

@Injectable()
export class TransporteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: OrgCountersService,
  ) {}

  async listTransportistas(orgId: string): Promise<TransportistaDto[]> {
    const rows = await this.prisma.transportista.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { nombre: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      tipo: row.tipo,
      documento: row.documento,
      telefono: row.telefono,
      email: row.email,
    }));
  }

  async crearTransportista(orgId: string, dto: CrearTransportistaDto): Promise<TransportistaDto> {
    const row = await this.prisma.transportista.create({
      data: {
        organizationId: orgId,
        nombre: dto.nombre.trim(),
        tipo: dto.tipo ?? 'EMPRESA',
        documento: blankToNull(dto.documento ?? ''),
        nit: blankToNull(dto.nit ?? ''),
        contacto: blankToNull(dto.contacto ?? ''),
        telefono: blankToNull(dto.telefono ?? ''),
        email: blankToNull(dto.email ?? ''),
        isActive: true,
      },
    });
    return {
      id: row.id,
      nombre: row.nombre,
      tipo: row.tipo,
      documento: row.documento,
      telefono: row.telefono,
      email: row.email,
    };
  }

  async listVehiculos(orgId: string): Promise<VehiculoDto[]> {
    const rows = await this.prisma.vehiculo.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { placa: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      placa: row.placa,
      tipo: row.tipo,
      capacidadKg: row.capacidadKg ? Number(row.capacidadKg) : null,
      estado: row.estado,
    }));
  }

  async crearVehiculo(orgId: string, dto: CrearVehiculoDto): Promise<VehiculoDto> {
    const row = await this.prisma.vehiculo.create({
      data: {
        organizationId: orgId,
        transportistaId: dto.transportistaId,
        placa: dto.placa.trim().toUpperCase(),
        tipo: blankToNull(dto.tipo ?? ''),
        marca: blankToNull(dto.marca ?? ''),
        modelo: blankToNull(dto.modelo ?? ''),
        capacidadKg:
          dto.capacidadKg != null ? new Prisma.Decimal(dto.capacidadKg) : null,
        capacidadM3:
          dto.capacidadM3 != null ? new Prisma.Decimal(dto.capacidadM3) : null,
        numEjes: dto.numEjes,
        estado: dto.estado ?? 'DISPONIBLE',
        isActive: true,
      },
    });
    return {
      id: row.id,
      placa: row.placa,
      tipo: row.tipo,
      capacidadKg: row.capacidadKg ? Number(row.capacidadKg) : null,
      estado: row.estado,
    };
  }

  async listConductores(orgId: string): Promise<ConductorDto[]> {
    const rows = await this.prisma.conductor.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { nombre: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      documento: row.documento,
      telefono: row.telefono,
    }));
  }

  async crearConductor(orgId: string, dto: CrearConductorDto): Promise<ConductorDto> {
    const row = await this.prisma.conductor.create({
      data: {
        organizationId: orgId,
        transportistaId: dto.transportistaId,
        nombre: dto.nombre.trim(),
        documento: dto.documento.trim(),
        telefono: blankToNull(dto.telefono ?? ''),
        licencia: blankToNull(dto.licencia ?? ''),
        tipoLicencia: blankToNull(dto.tipoLicencia ?? ''),
        isActive: true,
      },
    });
    return {
      id: row.id,
      nombre: row.nombre,
      documento: row.documento,
      telefono: row.telefono,
    };
  }

  async listRutas(orgId: string): Promise<RutaDto[]> {
    const rows = await this.prisma.ruta.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        paradas: { where: { isActive: true }, orderBy: { sequence: 'asc' } },
      },
      orderBy: { nombre: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      paradas: row.paradas.map((p) => ({
        sequence: p.sequence,
        nombre: p.nombre,
        destinoNombre: p.destinoNombre ?? undefined,
        lat: p.lat ?? undefined,
        lng: p.lng ?? undefined,
      })),
    }));
  }

  async crearRuta(
    orgId: string,
    usuarioId: string,
    dto: CrearRutaDto,
  ): Promise<RutaDto> {
    if (!dto.paradas?.length) {
      throw new BadRequestException('La ruta debe tener al menos una parada');
    }
    const codigo = await this.counters.codigoRuta(orgId);
    const id = await this.prisma.$transaction(async (tx) => {
      const ruta = await tx.ruta.create({
        data: {
          organizationId: orgId,
          codigo,
          nombre: dto.nombre.trim(),
          descripcion: blankToNull(dto.descripcion ?? ''),
          createdById: usuarioId,
          isActive: true,
        },
      });
      for (const parada of dto.paradas) {
        await tx.rutaParada.create({
          data: {
            rutaId: ruta.id,
            sequence: parada.sequence,
            nombre: parada.nombre.trim(),
            destinoNombre: blankToNull(parada.destinoNombre ?? ''),
            lat: parada.lat,
            lng: parada.lng,
            isActive: true,
          },
        });
      }
      return ruta.id;
    });
    const created = await this.listRutas(orgId);
    return created.find((r) => r.id === id)!;
  }

  async listViajes(orgId: string, opts?: { activos?: boolean }): Promise<ViajeResumenTransporteDto[]> {
    const estadosActivos: ViajeEstado[] = [
      ViajeEstado.EN_TRANSITO,
      ViajeEstado.LLEGO_DESTINO,
      ViajeEstado.CARGADO,
      ViajeEstado.LISTO,
    ];
    const rows = await this.prisma.viaje.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        ...(opts?.activos !== false
          ? { estado: { in: [...estadosActivos, ViajeEstado.PLANIFICADO, ViajeEstado.CARGANDO] } }
          : {}),
      },
      include: {
        despacho: { select: { codigo: true } },
        pod: { select: { estado: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      estado: row.estado,
      despachoCodigo: row.despacho.codigo,
      destinoNombre: row.destinoNombre,
      vehiculoPlaca: row.vehiculoPlaca,
      palletsCargados: row.palletsCargados,
      kitsCargados: row.kitsCargados,
      salidaReal: row.salidaReal?.toISOString() ?? null,
      entregaEstado: row.pod?.estado ?? null,
    }));
  }

  async getViaje(orgId: string, id: string): Promise<ViajeDetalleDto> {
    const row = await this.prisma.viaje.findFirst({
      where: { id, organizationId: orgId, isActive: true },
      include: VIAJE_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Viaje no encontrado');
    }
    return await this.toViajeDetalle(row);
  }

  async crearParadas(
    orgId: string,
    viajeId: string,
    dto: CrearViajeParadasDto,
  ): Promise<ViajeDetalleDto> {
    const viaje = await this.requireViaje(orgId, viajeId);
    const existentes = await this.prisma.viajeParada.count({
      where: { viajeId, isActive: true },
    });
    if (existentes > 0) {
      throw new BadRequestException('Este viaje ya tiene paradas definidas');
    }
    let paradas = dto.paradas ?? [];
    if (dto.rutaId) {
      const ruta = await this.prisma.ruta.findFirst({
        where: { id: dto.rutaId, organizationId: orgId, isActive: true },
        include: { paradas: { where: { isActive: true }, orderBy: { sequence: 'asc' } } },
      });
      if (!ruta) {
        throw new NotFoundException('Ruta no encontrada');
      }
      paradas = ruta.paradas.map((p) => ({
        sequence: p.sequence,
        nombre: p.nombre,
        destinoNombre: p.destinoNombre ?? undefined,
      }));
      await this.prisma.viaje.update({
        where: { id: viajeId },
        data: { rutaId: ruta.id },
      });
    }
    if (!paradas.length) {
      throw new BadRequestException('Indicá paradas manuales o una ruta plantilla');
    }
    await this.prisma.$transaction(async (tx) => {
      for (const parada of paradas) {
        await tx.viajeParada.create({
          data: {
            viajeId,
            sequence: parada.sequence,
            nombre: parada.nombre.trim(),
            destinoNombre: blankToNull(parada.destinoNombre ?? ''),
            estado: ViajeParadaEstado.PENDIENTE,
            isActive: true,
          },
        });
      }
    });
    return this.getViaje(orgId, viajeId);
  }

  async listCargaPallets(orgId: string, viajeId: string): Promise<CargaPalletDto[]> {
    await this.requireViaje(orgId, viajeId);
    const carga = await this.prisma.carga.findUnique({
      where: { viajeId },
      include: {
        items: {
          where: { isActive: true },
          include: {
            palletDespacho: {
              include: {
                items: { where: { isActive: true, retiradoAt: null } },
                viajeParadaLink: {
                  where: { isActive: true },
                  include: { viajeParada: { select: { id: true, nombre: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!carga) {
      return [];
    }
    return carga.items
      .filter((i) => i.palletDespacho)
      .map((i) => {
        const p = i.palletDespacho!;
        const link = p.viajeParadaLink;
        return {
          id: p.id,
          codigo: p.codigo,
          destinoNombre: p.destinoNombre,
          kitsCount: p.items.length,
          pesoBrutoKg: p.pesoBrutoKg ? Number(p.pesoBrutoKg) : null,
          paradaId: link?.viajeParadaId ?? null,
          paradaNombre: link?.viajeParada.nombre ?? null,
        };
      });
  }

  async autoAsignarPallets(orgId: string, viajeId: string): Promise<AutoAsignarResultDto> {
    await this.requireViaje(orgId, viajeId);
    const asignados = await this.prisma.$transaction(async (tx) =>
      autoAsignarPalletsEnViaje(tx, viajeId),
    );
    const sinAsignar = await contarPalletsSinAsignar(this.prisma, viajeId);
    return { asignados, sinAsignar };
  }

  async asignarPalletParada(
    orgId: string,
    viajeId: string,
    paradaId: string,
    dto: AsignarPalletParadaDto,
  ): Promise<ViajeDetalleDto> {
    const viaje = await this.requireViaje(orgId, viajeId);
    if (viaje.estado === ViajeEstado.ENTREGADO || viaje.estado === ViajeEstado.CANCELADO) {
      throw new BadRequestException('El viaje no acepta cambios de carga');
    }
    const parada = await this.prisma.viajeParada.findFirst({
      where: { id: paradaId, viajeId, isActive: true },
    });
    if (!parada) {
      throw new NotFoundException('Parada no encontrada');
    }
    const pallet = await this.prisma.palletDespacho.findFirst({
      where: {
        organizationId: orgId,
        codigo: { equals: dto.codigoPallet.trim(), mode: 'insensitive' },
        isActive: true,
        cargaItem: { carga: { viajeId } },
      },
    });
    if (!pallet) {
      throw new BadRequestException('Pallet no encontrado en la carga de este viaje');
    }
    const existente = await this.prisma.viajeParadaPallet.findUnique({
      where: { palletDespachoId: pallet.id },
    });
    if (existente?.isActive && existente.viajeParadaId !== paradaId) {
      throw new BadRequestException('Este pallet ya está asignado a otra parada');
    }
    await this.prisma.viajeParadaPallet.upsert({
      where: { palletDespachoId: pallet.id },
      create: {
        viajeParadaId: paradaId,
        palletDespachoId: pallet.id,
        isActive: true,
      },
      update: { viajeParadaId: paradaId, isActive: true },
    });
    return this.getViaje(orgId, viajeId);
  }

  async desasignarPallet(
    orgId: string,
    viajeId: string,
    palletDespachoId: string,
  ): Promise<ViajeDetalleDto> {
    await this.requireViaje(orgId, viajeId);
    const link = await this.prisma.viajeParadaPallet.findUnique({
      where: { palletDespachoId },
      include: { viajeParada: { select: { viajeId: true } } },
    });
    if (!link || link.viajeParada.viajeId !== viajeId) {
      throw new NotFoundException('Asignación no encontrada');
    }
    await this.prisma.viajeParadaPallet.update({
      where: { id: link.id },
      data: { isActive: false },
    });
    return this.getViaje(orgId, viajeId);
  }

  async registrarLlegadaParada(
    orgId: string,
    usuarioId: string,
    viajeId: string,
    paradaId: string,
  ): Promise<ViajeDetalleDto> {
    await this.requireViaje(orgId, viajeId);
    const parada = await this.requireParada(viajeId, paradaId);
    const ahora = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.viajeParada.update({
        where: { id: paradaId },
        data: { estado: ViajeParadaEstado.LLEGADA, llegadaAt: ahora },
      });
      await tx.transportEvent.create({
        data: {
          viajeId,
          tipo: TransportEventTipo.LLEGADA_PARADA,
          fechaHora: ahora,
          ubicacionNombre: parada.nombre,
          createdById: usuarioId,
          isActive: true,
        },
      });
      const ultima = await tx.viajeParada.findFirst({
        where: { viajeId, isActive: true },
        orderBy: { sequence: 'desc' },
      });
      if (ultima?.id === paradaId) {
        await tx.viaje.update({
          where: { id: viajeId },
          data: { estado: ViajeEstado.LLEGO_DESTINO, llegadaReal: ahora },
        });
      }
    });
    return this.getViaje(orgId, viajeId);
  }

  async registrarSalidaParada(
    orgId: string,
    usuarioId: string,
    viajeId: string,
    paradaId: string,
  ): Promise<ViajeDetalleDto> {
    await this.requireViaje(orgId, viajeId);
    const parada = await this.requireParada(viajeId, paradaId);
    const ahora = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.viajeParada.update({
        where: { id: paradaId },
        data: { estado: ViajeParadaEstado.COMPLETADA, salidaAt: ahora },
      });
      await tx.transportEvent.create({
        data: {
          viajeId,
          tipo: TransportEventTipo.SALIDA_PARADA,
          fechaHora: ahora,
          ubicacionNombre: parada.nombre,
          createdById: usuarioId,
          isActive: true,
        },
      });
    });
    return this.getViaje(orgId, viajeId);
  }

  /** Usado también desde despacho al confirmar salida. */
  async autoAsignarPalletsEnTransaccion(
    tx: Prisma.TransactionClient,
    viajeId: string,
  ): Promise<number> {
    return autoAsignarPalletsEnViaje(tx, viajeId);
  }

  private async requireParada(viajeId: string, paradaId: string) {
    const row = await this.prisma.viajeParada.findFirst({
      where: { id: paradaId, viajeId, isActive: true },
    });
    if (!row) {
      throw new NotFoundException('Parada no encontrada');
    }
    return row;
  }

  async registrarEvento(
    orgId: string,
    usuarioId: string,
    viajeId: string,
    dto: RegistrarTransportEventDto,
  ): Promise<ViajeDetalleDto> {
    await this.requireViaje(orgId, viajeId);
    const fecha = dto.fechaHora ? new Date(dto.fechaHora) : new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.transportEvent.create({
        data: {
          viajeId,
          tipo: dto.tipo,
          fechaHora: fecha,
          ubicacionNombre: blankToNull(dto.ubicacionNombre ?? ''),
          observaciones: blankToNull(dto.observaciones ?? ''),
          createdById: usuarioId,
          isActive: true,
        },
      });
      if (dto.tipo === TransportEventTipo.LLEGADA_DESTINO) {
        await tx.viaje.update({
          where: { id: viajeId },
          data: { estado: ViajeEstado.LLEGO_DESTINO, llegadaReal: fecha },
        });
      }
    });
    return this.getViaje(orgId, viajeId);
  }

  private async requireViaje(orgId: string, id: string) {
    const row = await this.prisma.viaje.findFirst({
      where: { id, organizationId: orgId, isActive: true },
    });
    if (!row) {
      throw new NotFoundException('Viaje no encontrado');
    }
    return row;
  }

  private async toViajeDetalle(
    row: Prisma.ViajeGetPayload<{ include: typeof VIAJE_INCLUDE }>,
  ): Promise<ViajeDetalleDto> {
    const sinAsignar = await contarPalletsSinAsignar(this.prisma, row.id);
    return {
      id: row.id,
      codigo: row.codigo,
      estado: row.estado,
      despachoId: row.despachoId,
      despachoCodigo: row.despacho.codigo,
      origenNombre: row.origenNombre,
      destinoNombre: row.destinoNombre,
      vehiculoPlaca: row.vehiculoPlaca,
      transportistaNombre: row.transportistaNombre,
      conductorNombre: row.conductorNombre,
      palletsEsperados: row.palletsEsperados,
      palletsCargados: row.palletsCargados,
      kitsEsperados: row.kitsEsperados,
      kitsCargados: row.kitsCargados,
      pesoCargadoKg: Number(row.pesoCargadoKg),
      salidaProgramada: row.salidaProgramada?.toISOString() ?? null,
      salidaReal: row.salidaReal?.toISOString() ?? null,
      llegadaEstimada: row.llegadaEstimada?.toISOString() ?? null,
      llegadaReal: row.llegadaReal?.toISOString() ?? null,
      observaciones: row.observaciones,
      rutaId: row.rutaId,
      palletsSinAsignar: sinAsignar,
      paradas: row.paradas.map((p) => {
        const codigos = p.pallets.map((pp) => pp.palletDespacho.codigo);
        const kitsCount = p.pallets.reduce(
          (sum, pp) => sum + pp.palletDespacho.items.length,
          0,
        );
        return {
          id: p.id,
          sequence: p.sequence,
          nombre: p.nombre,
          destinoNombre: p.destinoNombre,
          estado: p.estado,
          palletCodigos: codigos,
          palletsCount: codigos.length,
          kitsCount,
        };
      }),
      eventos: row.eventos.map(
        (e): TransportEventDto => ({
          id: e.id,
          tipo: e.tipo,
          fechaHora: e.fechaHora.toISOString(),
          ubicacionNombre: e.ubicacionNombre,
          observaciones: e.observaciones,
        }),
      ),
      entregaEstado: row.pod?.estado ?? null,
    };
  }
}
