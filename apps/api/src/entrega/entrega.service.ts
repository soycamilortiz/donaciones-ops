import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EntregaEstado,
  InventoryMovimientoTipo,
  KitInstanciaEstado,
  TransportEventTipo,
  ViajeEstado,
  DespachoEstado,
} from '@prisma/client';
import { blankToNull } from '../common/soft-delete';
import { OrgCountersService } from '../org-counters/org-counters.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ConfirmarEntregaDto,
  EntregaContextoDto,
  EntregaPalletDto,
  EntregaPendienteDto,
  ProofOfDeliveryDto,
} from './dto/entrega.dto';

@Injectable()
export class EntregaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counters: OrgCountersService,
  ) {}

  async listPendientes(orgId: string): Promise<EntregaPendienteDto[]> {
    const rows = await this.prisma.viaje.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        estado: { in: [ViajeEstado.EN_TRANSITO, ViajeEstado.LLEGO_DESTINO] },
        OR: [{ pod: { is: null } }, { pod: { estado: { not: EntregaEstado.COMPLETA } } }],
      },
      include: {
        despacho: { select: { codigo: true } },
        pod: { select: { estado: true } },
      },
      orderBy: { salidaReal: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      viajeId: row.id,
      viajeCodigo: row.codigo,
      despachoCodigo: row.despacho.codigo,
      destinoNombre: row.destinoNombre,
      kitsCargados: row.kitsCargados,
      salidaReal: row.salidaReal?.toISOString() ?? null,
    }));
  }

  async getContexto(orgId: string, viajeId: string): Promise<EntregaContextoDto> {
    const viaje = await this.requireViajeEntregable(orgId, viajeId);
    const pallets = await this.loadPalletsViaje(viajeId);
    return {
      viajeId: viaje.id,
      viajeCodigo: viaje.codigo,
      despachoCodigo: viaje.despacho.codigo,
      destinoNombre: viaje.destinoNombre ?? viaje.despacho.destinoNombre,
      kitsEsperados: viaje.kitsCargados,
      palletsCount: pallets.length,
      pallets,
      entregaEstado: viaje.pod?.estado ?? null,
    };
  }

  async getPalletByCodigo(orgId: string, codigo: string): Promise<EntregaPalletDto> {
    const pallet = await this.prisma.palletDespacho.findFirst({
      where: {
        organizationId: orgId,
        codigo: { equals: codigo.trim(), mode: 'insensitive' },
        isActive: true,
        estado: { in: ['DESPACHADO', 'CARGADO'] },
      },
      include: {
        cargaItem: { include: { carga: { include: { viaje: { include: { despacho: true } } } } } },
        items: { where: { isActive: true, retiradoAt: null } },
      },
    });
    if (!pallet?.cargaItem?.carga.viaje) {
      throw new NotFoundException('Pallet no encontrado en un viaje activo');
    }
    return this.toPalletDto(pallet, pallet.cargaItem.carga.viaje.despacho.codigo);
  }

  async confirmarEntrega(
    orgId: string,
    usuarioId: string,
    viajeId: string,
    dto: ConfirmarEntregaDto,
  ): Promise<ProofOfDeliveryDto> {
    const viaje = await this.requireViajeEntregable(orgId, viajeId);
    if (viaje.pod?.estado === EntregaEstado.COMPLETA) {
      throw new BadRequestException('Este viaje ya fue entregado');
    }
    const pallets = await this.prisma.palletDespacho.findMany({
      where: {
        isActive: true,
        cargaItem: { carga: { viajeId } },
      },
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
    const kitsEsperados = pallets.reduce((sum, p) => sum + p.items.length, 0);
    const recibida = dto.cantidadRecibida ?? kitsEsperados;
    const danada = dto.cantidadDanada ?? 0;
    const faltante = dto.cantidadFaltante ?? Math.max(0, kitsEsperados - recibida - danada);
    const devuelta = dto.cantidadDevuelta ?? faltante;
    const estado = this.resolverEstado(recibida, kitsEsperados, danada, faltante, devuelta);
    const ahora = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.proofOfDelivery.upsert({
        where: { viajeId },
        create: {
          viajeId,
          despachoId: viaje.despachoId,
          estado,
          receivedBy: dto.receivedBy.trim(),
          receiverDocument: blankToNull(dto.receiverDocument ?? ''),
          cantidadEsperada: kitsEsperados,
          cantidadRecibida: recibida,
          cantidadDanada: danada,
          cantidadFaltante: faltante,
          cantidadDevuelta: devuelta,
          observaciones: blankToNull(dto.observaciones ?? ''),
          entregadoAt: ahora,
        },
        update: {
          estado,
          receivedBy: dto.receivedBy.trim(),
          receiverDocument: blankToNull(dto.receiverDocument ?? ''),
          cantidadEsperada: kitsEsperados,
          cantidadRecibida: recibida,
          cantidadDanada: danada,
          cantidadFaltante: faltante,
          cantidadDevuelta: devuelta,
          observaciones: blankToNull(dto.observaciones ?? ''),
          entregadoAt: ahora,
        },
      });

      for (const pallet of pallets) {
        for (const item of pallet.items) {
          if (!item.kitInstancia) {
            continue;
          }
          await tx.kitInstancia.update({
            where: { id: item.kitInstancia.id },
            data: { estado: KitInstanciaEstado.ENTREGADO },
          });
          for (const linea of item.kitInstancia.items) {
            if (!linea.inventoryItemId) {
              continue;
            }
            const codigoMov = await this.counters.codigoMovimiento(orgId);
            await tx.inventoryMovimiento.create({
              data: {
                codigo: codigoMov,
                organizationId: orgId,
                acopioId: viaje.acopioId,
                inventoryItemId: linea.inventoryItemId,
                tipo: InventoryMovimientoTipo.ENTREGA,
                cantidad: linea.cantidad,
                origenUbicacionId: null,
                destinoUbicacionId: null,
                kitInstanciaItemId: linea.id,
                despachoId: viaje.despachoId,
                viajeId,
                usuarioId,
                observaciones: `Entrega ${viaje.codigo}`,
                isActive: true,
              },
            });
          }
        }
      }

      if (devuelta > 0) {
        const codigoDev = await this.counters.codigoMovimiento(orgId);
        const primerItem = pallets[0]?.items[0]?.kitInstancia?.items[0];
        if (primerItem?.inventoryItemId) {
          await tx.inventoryMovimiento.create({
            data: {
              codigo: codigoDev,
              organizationId: orgId,
              acopioId: viaje.acopioId,
              inventoryItemId: primerItem.inventoryItemId,
              tipo: InventoryMovimientoTipo.DEVOLUCION,
              cantidad: devuelta,
              despachoId: viaje.despachoId,
              viajeId,
              usuarioId,
              observaciones: `Devolución parcial ${viaje.codigo}`,
              isActive: true,
            },
          });
        }
      }

      await tx.viaje.update({
        where: { id: viajeId },
        data: { estado: ViajeEstado.ENTREGADO, llegadaReal: ahora },
      });

      const viajesDespacho = await tx.viaje.findMany({
        where: { despachoId: viaje.despachoId, isActive: true },
        select: { estado: true },
      });
      const todosEntregados = viajesDespacho.every(
        (v) => v.estado === ViajeEstado.ENTREGADO || v.estado === ViajeEstado.CANCELADO,
      );
      await tx.despacho.update({
        where: { id: viaje.despachoId },
        data: {
          estado: todosEntregados ? DespachoEstado.ENTREGADO : DespachoEstado.PARCIAL,
        },
      });

      const tieneLlegada = await tx.transportEvent.findFirst({
        where: { viajeId, tipo: TransportEventTipo.LLEGADA_DESTINO, isActive: true },
      });
      if (!tieneLlegada) {
        await tx.transportEvent.create({
          data: {
            viajeId,
            tipo: TransportEventTipo.LLEGADA_DESTINO,
            fechaHora: ahora,
            ubicacionNombre: viaje.destinoNombre,
            observaciones: 'Confirmación de entrega',
            createdById: usuarioId,
            isActive: true,
          },
        });
      }
    });

    const pod = await this.prisma.proofOfDelivery.findUnique({ where: { viajeId } });
    return {
      id: pod!.id,
      estado: pod!.estado,
      cantidadEsperada: pod!.cantidadEsperada,
      cantidadRecibida: pod!.cantidadRecibida,
      cantidadDanada: pod!.cantidadDanada,
      cantidadFaltante: pod!.cantidadFaltante,
      cantidadDevuelta: pod!.cantidadDevuelta,
      receivedBy: pod!.receivedBy,
      entregadoAt: pod!.entregadoAt?.toISOString() ?? null,
    };
  }

  private resolverEstado(
    recibida: number,
    esperada: number,
    danada: number,
    faltante: number,
    devuelta: number,
  ): EntregaEstado {
    if (recibida === 0 && devuelta >= esperada) {
      return EntregaEstado.RECHAZADA;
    }
    if (danada > 0 || faltante > 0 || devuelta > 0 || recibida < esperada) {
      return EntregaEstado.CON_DIFERENCIAS;
    }
    if (recibida < esperada) {
      return EntregaEstado.PARCIAL;
    }
    return EntregaEstado.COMPLETA;
  }

  private async requireViajeEntregable(orgId: string, viajeId: string) {
    const row = await this.prisma.viaje.findFirst({
      where: {
        id: viajeId,
        organizationId: orgId,
        isActive: true,
        estado: {
          in: [ViajeEstado.EN_TRANSITO, ViajeEstado.LLEGO_DESTINO, ViajeEstado.ENTREGADO],
        },
      },
      include: {
        despacho: { select: { codigo: true, destinoNombre: true } },
        pod: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Viaje no disponible para entrega');
    }
    return row;
  }

  private async loadPalletsViaje(viajeId: string): Promise<EntregaPalletDto[]> {
    const items = await this.prisma.cargaItem.findMany({
      where: { isActive: true, carga: { viajeId } },
      include: {
        palletDespacho: {
          include: {
            items: { where: { isActive: true, retiradoAt: null } },
            despacho: { select: { codigo: true } },
          },
        },
      },
    });
    return items
      .filter((i) => i.palletDespacho)
      .map((i) => this.toPalletDto(i.palletDespacho!, i.palletDespacho!.despacho?.codigo ?? ''));
  }

  private toPalletDto(
    pallet: {
      id: string;
      codigo: string;
      destinoNombre: string;
      pesoBrutoKg: { toNumber?: () => number } | null;
      items: unknown[];
    },
    despachoCodigo: string,
  ): EntregaPalletDto {
    return {
      id: pallet.id,
      codigo: pallet.codigo,
      destinoNombre: pallet.destinoNombre,
      kitsEsperados: pallet.items.length,
      pesoBrutoKg: pallet.pesoBrutoKg ? Number(pallet.pesoBrutoKg) : null,
      despachoCodigo,
    };
  }
}
