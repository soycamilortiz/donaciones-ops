import type { Prisma } from '@prisma/client';

export function normalizarDestino(valor: string): string {
  return valor.trim().toLowerCase();
}

export function paradaCoincideDestino(
  parada: { nombre: string; destinoNombre: string | null },
  palletDestino: string,
): boolean {
  const destino = normalizarDestino(palletDestino);
  if (parada.destinoNombre && normalizarDestino(parada.destinoNombre) === destino) {
    return true;
  }
  if (normalizarDestino(parada.nombre) === destino) {
    return true;
  }
  return false;
}

type DbLike = Pick<
  Prisma.TransactionClient,
  'viajeParada' | 'viajeParadaPallet' | 'carga' | 'palletDespacho'
>;

/** Asigna pallets de la carga a paradas según destinoNombre. Devuelve cantidad asignada. */
export async function autoAsignarPalletsEnViaje(db: DbLike, viajeId: string): Promise<number> {
  const paradas = await db.viajeParada.findMany({
    where: { viajeId, isActive: true },
    orderBy: { sequence: 'asc' },
  });
  if (paradas.length === 0) {
    return 0;
  }
  const carga = await db.carga.findUnique({
    where: { viajeId },
    include: {
      items: {
        where: { isActive: true },
        include: { palletDespacho: { select: { id: true, destinoNombre: true } } },
      },
    },
  });
  if (!carga) {
    return 0;
  }
  let asignados = 0;
  for (const item of carga.items) {
    const pallet = item.palletDespacho;
    if (!pallet) {
      continue;
    }
    const ya = await db.viajeParadaPallet.findUnique({
      where: { palletDespachoId: pallet.id },
    });
    if (ya?.isActive) {
      continue;
    }
    const parada = paradas.find((p) => paradaCoincideDestino(p, pallet.destinoNombre));
    if (!parada) {
      continue;
    }
    if (ya) {
      await db.viajeParadaPallet.update({
        where: { id: ya.id },
        data: { viajeParadaId: parada.id, isActive: true },
      });
    } else {
      await db.viajeParadaPallet.create({
        data: {
          viajeParadaId: parada.id,
          palletDespachoId: pallet.id,
          isActive: true,
        },
      });
    }
    asignados += 1;
  }
  return asignados;
}

export async function contarPalletsSinAsignar(db: DbLike, viajeId: string): Promise<number> {
  const carga = await db.carga.findUnique({
    where: { viajeId },
    include: {
      items: {
        where: { isActive: true },
        include: { palletDespacho: { select: { id: true } } },
      },
    },
  });
  if (!carga) {
    return 0;
  }
  let sinAsignar = 0;
  for (const item of carga.items) {
    if (!item.palletDespachoId) {
      continue;
    }
    const link = await db.viajeParadaPallet.findUnique({
      where: { palletDespachoId: item.palletDespachoId },
    });
    if (!link?.isActive) {
      sinAsignar += 1;
    }
  }
  return sinAsignar;
}
