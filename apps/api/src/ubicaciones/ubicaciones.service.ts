import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryMovimientoTipo,
  Prisma,
  PutawayEstado,
  UbicacionEstado,
  UbicacionFuncion,
  UbicacionTipo,
} from '@prisma/client';
import type { InventoryItem as InventoryItemContract } from '@soschoco/shared';
import { blankToNull } from '../common/soft-delete';
import { OrgCountersService } from '../org-counters/org-counters.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ConfirmarPutawayDto,
  CrearMovimientoDto,
  CrearPutawayDto,
  CreateUbicacionDto,
  InventoryMovimientoDto,
  PutawayDto,
  UbicacionDto,
  UpdateUbicacionDto,
} from './dto/ubicacion.dto';
import {
  categoriaCompatible,
  destinoAdmiteReubicacion,
  disponibleUnidades,
  FUNCIONES_PUTAWAY,
  MUELLE_CODIGO,
  motivoIncompatible,
  origenAdmiteReubicacion,
  planificarPutaway,
} from './reglas-ubicacion';

type Db = Prisma.TransactionClient | PrismaService;

const PUTAWAY_DESTINO = new Set<string>(FUNCIONES_PUTAWAY);

@Injectable()
export class UbicacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: OrgCountersService,
  ) {}

  async list(orgId: string, acopioId: string): Promise<UbicacionDto[]> {
    await this.requireAcopio(orgId, acopioId);
    await this.ensureMuelle(acopioId);
    const rows = await this.prisma.ubicacion.findMany({
      where: { acopioId, isActive: true },
      include: { balances: { where: { isActive: true } } },
      orderBy: [{ funcion: 'asc' }, { codigo: 'asc' }],
    });
    return rows.map((row) => this.toUbicacionDto(row));
  }

  async create(orgId: string, acopioId: string, dto: CreateUbicacionDto): Promise<UbicacionDto> {
    await this.requireAcopio(orgId, acopioId);
    await this.ensureMuelle(acopioId);
    const codigo = dto.codigo.trim().toUpperCase();
    if (codigo === MUELLE_CODIGO) {
      throw new BadRequestException('El código MUELLE está reservado para el muelle de recepción');
    }
    if (dto.parentId) {
      await this.requireUbicacion(acopioId, dto.parentId);
    }
    try {
      const row = await this.prisma.ubicacion.create({
        data: {
          acopioId,
          parentId: dto.parentId ?? null,
          codigo,
          nombre: dto.nombre.trim(),
          tipo: dto.tipo,
          funcion: dto.funcion,
          capacidadPesoKg: dto.capacidadPesoKg ?? null,
          capacidadVolumen: dto.capacidadVolumen ?? null,
          capacidadUnidades: dto.capacidadUnidades ?? null,
          zonaTemperatura: blankToNull(dto.zonaTemperatura),
          permiteAlimentos: dto.permiteAlimentos ?? true,
          permiteMedicamentos: dto.permiteMedicamentos ?? true,
          permiteRopa: dto.permiteRopa ?? true,
          esSistema: false,
          isActive: true,
        },
        include: { balances: true },
      });
      return this.toUbicacionDto(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Ya hay una ubicación con ese código en este acopio');
      }
      throw err;
    }
  }

  async update(
    orgId: string,
    acopioId: string,
    id: string,
    dto: UpdateUbicacionDto,
  ): Promise<UbicacionDto> {
    const actual = await this.requireUbicacion(acopioId, id);
    await this.requireAcopio(orgId, acopioId);
    if (actual.esSistema && dto.funcion && dto.funcion !== actual.funcion) {
      throw new BadRequestException('No se cambia la función de una ubicación de sistema');
    }
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Una ubicación no puede ser padre de sí misma');
      }
      await this.requireUbicacion(acopioId, dto.parentId);
    }
    const row = await this.prisma.ubicacion.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        tipo: dto.tipo,
        funcion: dto.funcion,
        estado: dto.estado,
        parentId: dto.parentId === undefined ? undefined : dto.parentId,
        capacidadPesoKg: dto.capacidadPesoKg === undefined ? undefined : dto.capacidadPesoKg,
        capacidadVolumen: dto.capacidadVolumen === undefined ? undefined : dto.capacidadVolumen,
        capacidadUnidades: dto.capacidadUnidades === undefined ? undefined : dto.capacidadUnidades,
        zonaTemperatura:
          dto.zonaTemperatura === undefined ? undefined : blankToNull(dto.zonaTemperatura ?? ''),
        permiteAlimentos: dto.permiteAlimentos,
        permiteMedicamentos: dto.permiteMedicamentos,
        permiteRopa: dto.permiteRopa,
      },
      include: { balances: { where: { isActive: true } } },
    });
    return this.toUbicacionDto(row);
  }

  async remove(orgId: string, acopioId: string, id: string): Promise<void> {
    const actual = await this.requireUbicacion(acopioId, id);
    await this.requireAcopio(orgId, acopioId);
    if (actual.esSistema) {
      throw new BadRequestException('El muelle de recepción no se da de baja');
    }
    const ocupacion = ocupacionDe(actual.balances);
    if (ocupacion > 0) {
      throw new BadRequestException('Hay inventario en esta ubicación; primero hay que moverlo');
    }
    await this.prisma.ubicacion.update({
      where: { id },
      data: { isActive: false, estado: UbicacionEstado.INACTIVA },
    });
  }

  /**
   * Tras validar: el stock aprobado nace en el muelle, no en un rack.
   * Ubicar es otro paso, con confirmación física.
   */
  async depositarEnMuelle(
    opts: {
      organizationId: string;
      acopioId: string;
      inventoryItemId: string;
      cantidad: number;
      usuarioId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const muelle = await this.ensureMuelle(opts.acopioId, db);
    await this.moverSaldo(db, opts.inventoryItemId, null, muelle.id, opts.cantidad);
    // `db` va también al contador: si el llamador abrió una transacción, el
    // código se numera dentro de ella en vez de tomar otra conexión del pool.
    const codigo = await this.counters.codigoMovimiento(opts.organizationId, new Date(), tx);
    await db.inventoryMovimiento.create({
      data: {
        codigo,
        organizationId: opts.organizationId,
        acopioId: opts.acopioId,
        inventoryItemId: opts.inventoryItemId,
        tipo: InventoryMovimientoTipo.RECEPCION,
        cantidad: new Prisma.Decimal(opts.cantidad),
        origenUbicacionId: null,
        destinoUbicacionId: muelle.id,
        usuarioId: opts.usuarioId,
        isActive: true,
      },
    });
  }

  async listPendientes(orgId: string, acopioId: string): Promise<InventoryItemContract[]> {
    await this.requireAcopio(orgId, acopioId);
    await this.ensureMuelle(acopioId);
    const rows = await this.prisma.inventoryItem.findMany({
      where: { acopioId, isActive: true },
      include: {
        balances: { where: { isActive: true }, include: { ubicacion: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    return rows.map((row) => this.toInventoryDto(row)).filter((row) => row.pendienteUbicar);
  }

  async sugerir(
    orgId: string,
    acopioId: string,
    itemId: string,
    cantidad?: number,
  ): Promise<{
    cantidad: number;
    sugeridas: Array<UbicacionDto & { compatible: boolean; motivo?: string | null }>;
    plan: Array<{ ubicacionId: string; codigo: string; cantidad: number }>;
  }> {
    const item = await this.requireItem(orgId, acopioId, itemId);
    const pendiente = this.cantidadPendiente(item);
    const pedir = cantidad && cantidad > 0 ? Math.min(cantidad, pendiente) : pendiente;
    if (pedir <= 0) {
      throw new BadRequestException('Este ítem no tiene cantidad pendiente de ubicar');
    }

    const rows = await this.prisma.ubicacion.findMany({
      where: {
        acopioId,
        isActive: true,
        estado: UbicacionEstado.ACTIVA,
        funcion: { in: [...PUTAWAY_DESTINO] as UbicacionFuncion[] },
      },
      include: { balances: { where: { isActive: true } } },
    });

    const sugeridas = rows
      .map((row) => {
        const dto = this.toUbicacionDto(row);
        const compatible = categoriaCompatible(item.categoria, row);
        return {
          ...dto,
          compatible,
          motivo: motivoIncompatible(item.categoria, row),
        };
      })
      .filter((row) => row.compatible)
      .sort((a, b) => {
        const da = a.disponibleUnidades;
        const db = b.disponibleUnidades;
        const aCubre = da == null || da >= pedir ? 1 : 0;
        const bCubre = db == null || db >= pedir ? 1 : 0;
        if (aCubre !== bCubre) {
          return bCubre - aCubre;
        }
        return (db ?? 1_000_000_000) - (da ?? 1_000_000_000);
      });

    const planRaw = planificarPutaway(
      pedir,
      sugeridas.map((row) => ({ id: row.id, disponible: row.disponibleUnidades ?? null })),
    );
    const porId = new Map(sugeridas.map((row) => [row.id, row]));
    const plan = planRaw.lineas.map((linea) => ({
      ubicacionId: linea.ubicacionId,
      codigo: porId.get(linea.ubicacionId)?.codigo ?? '',
      cantidad: linea.cantidad,
    }));

    return { cantidad: pedir, sugeridas, plan };
  }

  async crearPutaway(
    orgId: string,
    acopioId: string,
    itemId: string,
    usuarioId: string,
    dto: CrearPutawayDto,
  ): Promise<PutawayDto> {
    const item = await this.requireItem(orgId, acopioId, itemId);
    const muelle = await this.ensureMuelle(acopioId);
    await this.asegurarSaldoEnMuelle(item, muelle.id);
    const fresco = await this.requireItem(orgId, acopioId, itemId);
    const pendiente = this.cantidadPendiente(fresco);
    const total = dto.lineas.reduce((sum, linea) => sum + linea.cantidad, 0);
    if (total - pendiente > 0.001) {
      throw new BadRequestException(
        `Solo hay ${pendiente} pendientes de ubicar; pediste asignar ${total}`,
      );
    }

    for (const linea of dto.lineas) {
      const dest = await this.requireUbicacion(acopioId, linea.destinoUbicacionId);
      this.assertDestinoPutaway(dest, fresco.categoria, linea.cantidad);
    }

    const codigo = await this.counters.codigoPutaway(orgId);
    const row = await this.prisma.putaway.create({
      data: {
        codigo,
        organizationId: orgId,
        acopioId,
        inventoryItemId: itemId,
        estado: PutawayEstado.PENDIENTE,
        createdById: usuarioId,
        isActive: true,
        lineas: {
          create: dto.lineas.map((linea) => ({
            origenUbicacionId: muelle.id,
            destinoUbicacionId: linea.destinoUbicacionId,
            cantidad: new Prisma.Decimal(linea.cantidad),
            estado: PutawayEstado.PENDIENTE,
            isActive: true,
          })),
        },
      },
      include: PUTAWAY_INCLUDE,
    });
    return this.toPutawayDto(row);
  }

  async getPutaway(orgId: string, acopioId: string, id: string): Promise<PutawayDto> {
    await this.requireAcopio(orgId, acopioId);
    const row = await this.prisma.putaway.findFirst({
      where: { id, organizationId: orgId, acopioId },
      include: PUTAWAY_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Putaway no encontrado');
    }
    return this.toPutawayDto(row);
  }

  async confirmarPutaway(
    orgId: string,
    acopioId: string,
    id: string,
    usuarioId: string,
    dto: ConfirmarPutawayDto,
  ): Promise<PutawayDto> {
    const putaway = await this.prisma.putaway.findFirst({
      where: { id, organizationId: orgId, acopioId },
      include: PUTAWAY_INCLUDE,
    });
    if (!putaway) {
      throw new NotFoundException('Putaway no encontrado');
    }
    if (putaway.estado !== PutawayEstado.PENDIENTE) {
      throw new BadRequestException('Este putaway ya no está pendiente');
    }

    const porId = new Map(putaway.lineas.map((linea) => [linea.id, linea]));
    for (const conf of dto.lineas) {
      const linea = porId.get(conf.lineaId);
      if (!linea) {
        throw new BadRequestException('Hay una línea que no es de este putaway');
      }
      const esperado = linea.destinoUbicacion.codigo.trim().toUpperCase();
      const leido = conf.codigoDestino.trim().toUpperCase();
      if (esperado !== leido) {
        throw new BadRequestException(
          `El código no coincide con ${linea.destinoUbicacion.codigo}. Confirmá la ubicación real.`,
        );
      }
    }

    // Reservados antes de abrir la transacción: pedirlos de a uno adentro toma
    // una segunda conexión del pool mientras la transacción ya retiene la suya.
    const codigosMov = await this.counters.codigosMovimiento(orgId, dto.lineas.length);

    await this.prisma.$transaction(async (tx) => {
      for (const [i, conf] of dto.lineas.entries()) {
        const linea = porId.get(conf.lineaId);
        if (!linea) {
          continue;
        }
        const dest = await this.requireUbicacion(acopioId, linea.destinoUbicacionId, tx);
        this.assertDestinoPutaway(dest, putaway.inventoryItem.categoria, Number(linea.cantidad));
        await this.moverSaldo(
          tx,
          putaway.inventoryItemId,
          linea.origenUbicacionId,
          linea.destinoUbicacionId,
          Number(linea.cantidad),
        );
        await tx.inventoryMovimiento.create({
          data: {
            codigo: codigosMov[i],
            organizationId: orgId,
            acopioId,
            inventoryItemId: putaway.inventoryItemId,
            tipo: InventoryMovimientoTipo.PUTAWAY,
            cantidad: linea.cantidad,
            origenUbicacionId: linea.origenUbicacionId,
            destinoUbicacionId: linea.destinoUbicacionId,
            putawayId: putaway.id,
            usuarioId,
            isActive: true,
          },
        });
        await tx.putawayLinea.update({
          where: { id: linea.id },
          data: { estado: PutawayEstado.COMPLETADO, confirmedAt: new Date() },
        });
      }
      await tx.putaway.update({
        where: { id: putaway.id },
        data: {
          estado: PutawayEstado.COMPLETADO,
          confirmedById: usuarioId,
          confirmedAt: new Date(),
        },
      });
    });

    return this.getPutaway(orgId, acopioId, id);
  }

  async resolveZonaKitting(acopioId: string) {
    const kitting = await this.prisma.ubicacion.findFirst({
      where: {
        acopioId,
        isActive: true,
        estado: UbicacionEstado.ACTIVA,
        funcion: UbicacionFuncion.KITTING,
      },
      orderBy: { codigo: 'asc' },
    });
    if (kitting) {
      return kitting;
    }
    const picking = await this.prisma.ubicacion.findFirst({
      where: {
        acopioId,
        isActive: true,
        estado: UbicacionEstado.ACTIVA,
        funcion: UbicacionFuncion.PICKING,
      },
      orderBy: { codigo: 'asc' },
    });
    if (picking) {
      return picking;
    }
    throw new BadRequestException(
      'No hay zona de kitting o picking activa en este acopio. Creala en Ubicaciones.',
    );
  }

  /** Mueve stock reservado de almacén a kitting/picking al confirmar una línea de pick. */
  async moverParaPick(opts: {
    orgId: string;
    acopioId: string;
    usuarioId: string;
    reservaId: string;
    inventoryItemId: string;
    origenUbicacionId: string;
    destinoUbicacionId: string;
    cantidad: number;
    kitInstanciaItemId: string;
    categoriaInventario: string;
    codigoOrigen: string;
    codigoDestino: string;
  }): Promise<void> {
    await this.requireAcopio(opts.orgId, opts.acopioId);
    const origen = await this.requireUbicacion(opts.acopioId, opts.origenUbicacionId);
    const destino = await this.requireUbicacion(opts.acopioId, opts.destinoUbicacionId);
    const leidoOrigen = opts.codigoOrigen.trim().toUpperCase();
    const leidoDestino = opts.codigoDestino.trim().toUpperCase();
    if (origen.codigo.trim().toUpperCase() !== leidoOrigen) {
      throw new BadRequestException(
        `El código no coincide con ${origen.codigo}. Confirmá la ubicación de origen.`,
      );
    }
    if (destino.codigo.trim().toUpperCase() !== leidoDestino) {
      throw new BadRequestException(
        `El código no coincide con ${destino.codigo}. Confirmá la zona de kitting.`,
      );
    }
    if (
      destino.funcion !== UbicacionFuncion.KITTING &&
      destino.funcion !== UbicacionFuncion.PICKING
    ) {
      throw new BadRequestException('El destino debe ser una zona de kitting o picking');
    }
    this.assertDestinoReubicacion(destino, opts.categoriaInventario, opts.cantidad);

    const codigoMov = await this.counters.codigoMovimiento(opts.orgId);
    await this.prisma.$transaction(async (tx) => {
      const reservado = await tx.reservaAsignacion.aggregate({
        where: {
          inventoryItemId: opts.inventoryItemId,
          ubicacionId: opts.origenUbicacionId,
          isActive: true,
          reservaItem: {
            isActive: true,
            reservaId: opts.reservaId,
            reserva: { estado: 'RESERVADA', isActive: true },
          },
        },
        _sum: { cantidad: true },
      });
      const cupo = Number(reservado._sum.cantidad ?? 0);
      if (opts.cantidad - cupo > 0.001) {
        throw new BadRequestException(
          'La cantidad supera lo reservado en esa ubicación para esta reserva',
        );
      }

      await this.moverSaldoReservado(
        tx,
        opts.inventoryItemId,
        opts.origenUbicacionId,
        opts.destinoUbicacionId,
        opts.cantidad,
      );
      await this.consumirAsignacionReserva(tx, {
        reservaId: opts.reservaId,
        inventoryItemId: opts.inventoryItemId,
        ubicacionId: opts.origenUbicacionId,
        cantidad: opts.cantidad,
      });

      await tx.inventoryMovimiento.create({
        data: {
          codigo: codigoMov,
          organizationId: opts.orgId,
          acopioId: opts.acopioId,
          inventoryItemId: opts.inventoryItemId,
          tipo: InventoryMovimientoTipo.PICKING,
          cantidad: new Prisma.Decimal(opts.cantidad),
          origenUbicacionId: opts.origenUbicacionId,
          destinoUbicacionId: opts.destinoUbicacionId,
          kitInstanciaItemId: opts.kitInstanciaItemId,
          usuarioId: opts.usuarioId,
          isActive: true,
        },
      });
    });
  }

  async listMovimientos(
    orgId: string,
    acopioId: string,
    opts?: { itemId?: string; limite?: number },
  ): Promise<InventoryMovimientoDto[]> {
    await this.requireAcopio(orgId, acopioId);
    if (opts?.itemId) {
      await this.requireItem(orgId, acopioId, opts.itemId);
    }
    const take = Math.min(Math.max(opts?.limite ?? 50, 1), 100);
    const rows = await this.prisma.inventoryMovimiento.findMany({
      where: {
        organizationId: orgId,
        acopioId,
        isActive: true,
        ...(opts?.itemId ? { inventoryItemId: opts.itemId } : {}),
      },
      include: MOVIMIENTO_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((row) => this.toMovimientoDto(row));
  }

  async reubicar(
    orgId: string,
    acopioId: string,
    usuarioId: string,
    dto: CrearMovimientoDto,
  ): Promise<InventoryMovimientoDto> {
    const item = await this.requireItem(orgId, acopioId, dto.inventoryItemId);
    if (!item.isActive) {
      throw new BadRequestException('Ese ítem de inventario está dado de baja');
    }
    if (dto.origenUbicacionId === dto.destinoUbicacionId) {
      throw new BadRequestException('El origen y el destino tienen que ser distintos');
    }
    const origen = await this.requireUbicacion(acopioId, dto.origenUbicacionId);
    if (!origenAdmiteReubicacion(origen.funcion)) {
      throw new BadRequestException(
        'Lo que está en el muelle se ubica con putaway, no con un traslado entre zonas',
      );
    }
    const dest = await this.requireUbicacion(acopioId, dto.destinoUbicacionId);
    const esperado = dest.codigo.trim().toUpperCase();
    const leido = dto.codigoDestino.trim().toUpperCase();
    if (esperado !== leido) {
      throw new BadRequestException(
        `El código no coincide con ${dest.codigo}. Confirmá la ubicación real.`,
      );
    }
    this.assertDestinoReubicacion(dest, item.categoria, dto.cantidad);

    const codigoMov = await this.counters.codigoMovimiento(orgId);
    const row = await this.prisma.$transaction(async (tx) => {
      const destTx = await this.requireUbicacion(acopioId, dest.id, tx);
      this.assertDestinoReubicacion(destTx, item.categoria, dto.cantidad);
      await this.moverSaldo(tx, item.id, origen.id, dest.id, dto.cantidad);
      return tx.inventoryMovimiento.create({
        data: {
          codigo: codigoMov,
          organizationId: orgId,
          acopioId,
          inventoryItemId: item.id,
          tipo: InventoryMovimientoTipo.REUBICACION,
          cantidad: new Prisma.Decimal(dto.cantidad),
          origenUbicacionId: origen.id,
          destinoUbicacionId: dest.id,
          usuarioId,
          observaciones: blankToNull(dto.observaciones ?? ''),
          isActive: true,
        },
        include: MOVIMIENTO_INCLUDE,
      });
    });
    return this.toMovimientoDto(row);
  }

  async ensureMuelle(acopioId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const existente = await db.ubicacion.findFirst({
      where: { acopioId, esSistema: true, funcion: UbicacionFuncion.RECEPCION },
    });
    if (existente) {
      return existente;
    }
    try {
      return await db.ubicacion.create({
        data: {
          acopioId,
          codigo: MUELLE_CODIGO,
          nombre: 'Recepción / muelle',
          tipo: UbicacionTipo.ZONA,
          funcion: UbicacionFuncion.RECEPCION,
          estado: UbicacionEstado.ACTIVA,
          esSistema: true,
          isActive: true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const race = await db.ubicacion.findFirst({
          where: { acopioId, codigo: MUELLE_CODIGO },
        });
        if (race) {
          return race;
        }
      }
      throw err;
    }
  }

  private async asegurarSaldoEnMuelle(
    item: {
      id: string;
      cantidad: Prisma.Decimal;
      balances: Array<{ ubicacionId: string; cantidad: Prisma.Decimal; isActive: boolean }>;
    },
    muelleId: string,
  ) {
    const totalBalances = item.balances
      .filter((row) => row.isActive)
      .reduce((sum, row) => sum + Number(row.cantidad), 0);
    if (totalBalances > 0.001) {
      return;
    }
    const qty = Number(item.cantidad);
    if (qty <= 0) {
      return;
    }
    await this.moverSaldo(this.prisma, item.id, null, muelleId, qty);
  }

  private cantidadPendiente(item: {
    cantidad: Prisma.Decimal;
    balances: Array<{
      cantidad: Prisma.Decimal;
      isActive: boolean;
      ubicacion: { funcion: UbicacionFuncion };
    }>;
  }): number {
    const enMuelle = item.balances
      .filter((row) => row.isActive && row.ubicacion.funcion === UbicacionFuncion.RECEPCION)
      .reduce((sum, row) => sum + Number(row.cantidad), 0);
    const totalBalances = item.balances
      .filter((row) => row.isActive)
      .reduce((sum, row) => sum + Number(row.cantidad), 0);
    if (totalBalances <= 0.001) {
      return Number(item.cantidad);
    }
    return enMuelle;
  }

  private assertDestinoPutaway(
    dest: {
      estado: UbicacionEstado;
      isActive: boolean;
      funcion: UbicacionFuncion;
      permiteAlimentos: boolean;
      permiteMedicamentos: boolean;
      permiteRopa: boolean;
      capacidadUnidades: Prisma.Decimal | null;
      balances: Array<{ cantidad: Prisma.Decimal; isActive: boolean }>;
    },
    categoria: string,
    cantidad: number,
  ) {
    if (!dest.isActive || dest.estado !== UbicacionEstado.ACTIVA) {
      throw new BadRequestException('Esa ubicación no puede recibir inventario ahora');
    }
    if (!PUTAWAY_DESTINO.has(dest.funcion)) {
      throw new BadRequestException(
        'El inventario aprobado va a almacenamiento, no a recepción, cuarentena ni rechazo',
      );
    }
    if (!categoriaCompatible(categoria, dest)) {
      throw new BadRequestException(
        motivoIncompatible(categoria, dest) ?? 'Ubicación incompatible',
      );
    }
    const ocupacion = ocupacionDe(dest.balances);
    const cupo = disponibleUnidades(
      dest.capacidadUnidades == null ? null : Number(dest.capacidadUnidades),
      ocupacion,
    );
    if (cupo != null && cantidad - cupo > 0.001) {
      throw new BadRequestException(
        `Capacidad insuficiente: disponible ${cupo}, se intentan ubicar ${cantidad}`,
      );
    }
  }

  private assertDestinoReubicacion(
    dest: {
      estado: UbicacionEstado;
      isActive: boolean;
      funcion: UbicacionFuncion;
      permiteAlimentos: boolean;
      permiteMedicamentos: boolean;
      permiteRopa: boolean;
      capacidadUnidades: Prisma.Decimal | null;
      balances: Array<{ cantidad: Prisma.Decimal; isActive: boolean }>;
    },
    categoria: string,
    cantidad: number,
  ) {
    if (!dest.isActive || dest.estado !== UbicacionEstado.ACTIVA) {
      throw new BadRequestException('Esa ubicación no puede recibir inventario ahora');
    }
    if (!destinoAdmiteReubicacion(dest.funcion)) {
      throw new BadRequestException(
        dest.funcion === UbicacionFuncion.RECEPCION
          ? 'El muelle no es destino de un traslado. Para ubicar lo recibido usá el putaway.'
          : 'Esa ubicación no admite traslados',
      );
    }
    if (!categoriaCompatible(categoria, dest)) {
      throw new BadRequestException(
        motivoIncompatible(categoria, dest) ?? 'Ubicación incompatible',
      );
    }
    const ocupacion = ocupacionDe(dest.balances);
    const cupo = disponibleUnidades(
      dest.capacidadUnidades == null ? null : Number(dest.capacidadUnidades),
      ocupacion,
    );
    if (cupo != null && cantidad - cupo > 0.001) {
      throw new BadRequestException(
        `Capacidad insuficiente: disponible ${cupo}, se intentan mover ${cantidad}`,
      );
    }
  }

  private async moverSaldo(
    db: Db,
    inventoryItemId: string,
    origenId: string | null,
    destinoId: string,
    cantidad: number,
  ) {
    if (origenId) {
      const origen = await db.inventoryBalance.findUnique({
        where: { inventoryItemId_ubicacionId: { inventoryItemId, ubicacionId: origenId } },
      });
      if (!origen || Number(origen.cantidad) + 0.001 < cantidad) {
        throw new BadRequestException('No hay esa cantidad en la ubicación de origen');
      }
      const reservado = await db.reservaAsignacion.aggregate({
        where: {
          inventoryItemId,
          ubicacionId: origenId,
          isActive: true,
          reservaItem: {
            isActive: true,
            reserva: { estado: 'RESERVADA', isActive: true },
          },
        },
        _sum: { cantidad: true },
      });
      const libre = Number(origen.cantidad) - Number(reservado._sum.cantidad ?? 0);
      if (cantidad - libre > 0.001) {
        throw new BadRequestException(
          `Hay inventario reservado en esa ubicación. Libre: ${libre}, se intentan mover ${cantidad}`,
        );
      }
      const queda = Number(origen.cantidad) - cantidad;
      await db.inventoryBalance.update({
        where: { id: origen.id },
        data: { cantidad: new Prisma.Decimal(queda), isActive: queda > 0.001 },
      });
    }

    await db.inventoryBalance.upsert({
      where: { inventoryItemId_ubicacionId: { inventoryItemId, ubicacionId: destinoId } },
      create: {
        inventoryItemId,
        ubicacionId: destinoId,
        cantidad: new Prisma.Decimal(cantidad),
        isActive: true,
      },
      update: {
        cantidad: { increment: cantidad },
        isActive: true,
      },
    });
  }

  private async moverSaldoReservado(
    db: Db,
    inventoryItemId: string,
    origenId: string,
    destinoId: string,
    cantidad: number,
  ) {
    const origen = await db.inventoryBalance.findUnique({
      where: { inventoryItemId_ubicacionId: { inventoryItemId, ubicacionId: origenId } },
    });
    if (!origen || Number(origen.cantidad) + 0.001 < cantidad) {
      throw new BadRequestException('No hay esa cantidad en la ubicación de origen');
    }
    const queda = Number(origen.cantidad) - cantidad;
    await db.inventoryBalance.update({
      where: { id: origen.id },
      data: { cantidad: new Prisma.Decimal(queda), isActive: queda > 0.001 },
    });
    await db.inventoryBalance.upsert({
      where: { inventoryItemId_ubicacionId: { inventoryItemId, ubicacionId: destinoId } },
      create: {
        inventoryItemId,
        ubicacionId: destinoId,
        cantidad: new Prisma.Decimal(cantidad),
        isActive: true,
      },
      update: {
        cantidad: { increment: cantidad },
        isActive: true,
      },
    });
  }

  private async consumirAsignacionReserva(
    tx: Db,
    opts: {
      reservaId: string;
      inventoryItemId: string;
      ubicacionId: string;
      cantidad: number;
    },
  ) {
    let falta = opts.cantidad;
    const rows = await tx.reservaAsignacion.findMany({
      where: {
        inventoryItemId: opts.inventoryItemId,
        ubicacionId: opts.ubicacionId,
        isActive: true,
        reservaItem: { isActive: true, reservaId: opts.reservaId },
      },
      orderBy: { createdAt: 'asc' },
    });
    for (const row of rows) {
      if (falta <= 0.001) {
        break;
      }
      const qty = Number(row.cantidad);
      const cupo = Math.min(falta, qty);
      const resto = qty - cupo;
      if (resto <= 0.001) {
        await tx.reservaAsignacion.update({ where: { id: row.id }, data: { isActive: false } });
      } else {
        await tx.reservaAsignacion.update({
          where: { id: row.id },
          data: { cantidad: new Prisma.Decimal(resto) },
        });
      }
      falta -= cupo;
    }
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

  private async requireUbicacion(acopioId: string, id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const row = await db.ubicacion.findFirst({
      where: { id, acopioId },
      include: { balances: { where: { isActive: true } } },
    });
    if (!row) {
      throw new NotFoundException('Ubicación no encontrada');
    }
    return row;
  }

  private async requireItem(orgId: string, acopioId: string, itemId: string) {
    await this.requireAcopio(orgId, acopioId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, acopioId },
      include: {
        balances: { where: { isActive: true }, include: { ubicacion: true } },
      },
    });
    if (!item) {
      throw new NotFoundException('Ítem de inventario no encontrado');
    }
    return item;
  }

  toInventoryDto(row: {
    id: string;
    acopioId: string;
    nombre: string;
    categoria: string;
    categoriaDetalle: string | null;
    sku: string | null;
    marca: string | null;
    presentacion: string | null;
    talla: string | null;
    destinatario: string;
    cantidad: Prisma.Decimal;
    unidad: string;
    unidadDetalle: string | null;
    vencimiento: Date | null;
    estado: string;
    loteCodigo: string | null;
    ubicacionInterna: string | null;
    donanteNombre: string | null;
    donanteContacto: string | null;
    observaciones: string | null;
    isActive: boolean;
    balances: Array<{
      ubicacionId: string;
      cantidad: Prisma.Decimal;
      isActive: boolean;
      ubicacion: { codigo: string; nombre: string; funcion: UbicacionFuncion };
    }>;
  }): InventoryItemContract {
    const balances = row.balances
      .filter((b) => b.isActive && Number(b.cantidad) > 0)
      .map((b) => ({
        ubicacionId: b.ubicacionId,
        codigo: b.ubicacion.codigo,
        nombre: b.ubicacion.nombre,
        cantidad: Number(b.cantidad),
        funcion: b.ubicacion.funcion,
      }));
    const cantidadEnMuelle = balances
      .filter((b) => b.funcion === UbicacionFuncion.RECEPCION)
      .reduce((sum, b) => sum + b.cantidad, 0);
    const cantidadUbicada = balances
      .filter((b) => b.funcion !== UbicacionFuncion.RECEPCION)
      .reduce((sum, b) => sum + b.cantidad, 0);
    const pendienteUbicar =
      cantidadEnMuelle > 0.001 || (balances.length === 0 && Number(row.cantidad) > 0.001);
    return {
      id: row.id,
      acopioId: row.acopioId,
      nombre: row.nombre,
      categoria: row.categoria,
      categoriaDetalle: row.categoriaDetalle,
      sku: row.sku,
      marca: row.marca,
      presentacion: row.presentacion,
      talla: row.talla,
      destinatario: row.destinatario,
      cantidad: Number(row.cantidad),
      unidad: row.unidad,
      unidadDetalle: row.unidadDetalle,
      vencimiento: row.vencimiento?.toISOString() ?? null,
      estado: row.estado,
      loteCodigo: row.loteCodigo,
      ubicacionInterna: row.ubicacionInterna,
      donanteNombre: row.donanteNombre,
      donanteContacto: row.donanteContacto,
      observaciones: row.observaciones,
      isActive: row.isActive === true,
      cantidadEnMuelle,
      cantidadUbicada,
      pendienteUbicar,
      balances,
    };
  }

  private toUbicacionDto(row: {
    id: string;
    acopioId: string;
    parentId: string | null;
    codigo: string;
    nombre: string;
    tipo: UbicacionTipo;
    funcion: UbicacionFuncion;
    estado: UbicacionEstado;
    capacidadPesoKg: Prisma.Decimal | null;
    capacidadVolumen: Prisma.Decimal | null;
    capacidadUnidades: Prisma.Decimal | null;
    zonaTemperatura: string | null;
    permiteAlimentos: boolean;
    permiteMedicamentos: boolean;
    permiteRopa: boolean;
    esSistema: boolean;
    isActive: boolean;
    balances: Array<{ cantidad: Prisma.Decimal; isActive: boolean }>;
  }): UbicacionDto {
    const ocupacionUnidades = ocupacionDe(row.balances);
    const cap = row.capacidadUnidades == null ? null : Number(row.capacidadUnidades);
    return {
      id: row.id,
      acopioId: row.acopioId,
      parentId: row.parentId,
      codigo: row.codigo,
      nombre: row.nombre,
      tipo: row.tipo,
      funcion: row.funcion,
      estado: row.estado,
      capacidadPesoKg: row.capacidadPesoKg == null ? null : Number(row.capacidadPesoKg),
      capacidadVolumen: row.capacidadVolumen == null ? null : Number(row.capacidadVolumen),
      capacidadUnidades: cap,
      ocupacionUnidades,
      disponibleUnidades: disponibleUnidades(cap, ocupacionUnidades),
      zonaTemperatura: row.zonaTemperatura,
      permiteAlimentos: row.permiteAlimentos,
      permiteMedicamentos: row.permiteMedicamentos,
      permiteRopa: row.permiteRopa,
      esSistema: row.esSistema,
      isActive: row.isActive,
    };
  }

  private toPutawayDto(row: {
    id: string;
    codigo: string;
    organizationId: string;
    acopioId: string;
    inventoryItemId: string;
    estado: PutawayEstado;
    inventoryItem: { nombre: string; loteCodigo: string | null };
    lineas: Array<{
      id: string;
      origenUbicacionId: string;
      destinoUbicacionId: string;
      cantidad: Prisma.Decimal;
      estado: PutawayEstado;
      origenUbicacion: { codigo: string };
      destinoUbicacion: { codigo: string };
    }>;
  }): PutawayDto {
    return {
      id: row.id,
      codigo: row.codigo,
      organizationId: row.organizationId,
      acopioId: row.acopioId,
      inventoryItemId: row.inventoryItemId,
      estado: row.estado,
      inventoryNombre: row.inventoryItem.nombre,
      loteCodigo: row.inventoryItem.loteCodigo,
      lineas: row.lineas.map((linea) => ({
        id: linea.id,
        origenUbicacionId: linea.origenUbicacionId,
        origenCodigo: linea.origenUbicacion.codigo,
        destinoUbicacionId: linea.destinoUbicacionId,
        destinoCodigo: linea.destinoUbicacion.codigo,
        cantidad: Number(linea.cantidad),
        estado: linea.estado,
      })),
    };
  }

  private toMovimientoDto(row: {
    id: string;
    codigo: string;
    organizationId: string;
    acopioId: string;
    inventoryItemId: string;
    tipo: InventoryMovimientoTipo;
    cantidad: Prisma.Decimal;
    origenUbicacionId: string | null;
    destinoUbicacionId: string | null;
    observaciones: string | null;
    createdAt: Date;
    inventoryItem: { nombre: string; loteCodigo: string | null };
    origenUbicacion: { codigo: string } | null;
    destinoUbicacion: { codigo: string } | null;
  }): InventoryMovimientoDto {
    return {
      id: row.id,
      codigo: row.codigo,
      organizationId: row.organizationId,
      acopioId: row.acopioId,
      inventoryItemId: row.inventoryItemId,
      inventoryNombre: row.inventoryItem.nombre,
      loteCodigo: row.inventoryItem.loteCodigo,
      tipo: row.tipo,
      cantidad: Number(row.cantidad),
      origenUbicacionId: row.origenUbicacionId,
      origenCodigo: row.origenUbicacion?.codigo ?? null,
      destinoUbicacionId: row.destinoUbicacionId,
      destinoCodigo: row.destinoUbicacion?.codigo ?? null,
      observaciones: row.observaciones,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

const PUTAWAY_INCLUDE = {
  inventoryItem: { select: { nombre: true, loteCodigo: true, categoria: true } },
  lineas: {
    include: {
      origenUbicacion: { select: { codigo: true } },
      destinoUbicacion: { select: { codigo: true } },
    },
  },
} satisfies Prisma.PutawayInclude;

const MOVIMIENTO_INCLUDE = {
  inventoryItem: { select: { nombre: true, loteCodigo: true } },
  origenUbicacion: { select: { codigo: true } },
  destinoUbicacion: { select: { codigo: true } },
} satisfies Prisma.InventoryMovimientoInclude;

function ocupacionDe(balances: Array<{ cantidad: Prisma.Decimal; isActive: boolean }>): number {
  return balances.filter((row) => row.isActive).reduce((sum, row) => sum + Number(row.cantidad), 0);
}
