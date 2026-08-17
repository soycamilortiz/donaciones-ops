/**
 * Cerebro de asignación: FEFO, cobertura de kits y reparto de stock escaso.
 * Sin I/O: el servicio arma los candidatos y llama a estas funciones.
 */

export const ORDEN_PRIORIDAD: Record<string, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAJA: 3,
};

export type CandidatoSaldo = {
  inventoryItemId: string;
  ubicacionId: string;
  codigoUbicacion: string;
  loteCodigo: string | null;
  vencimiento: string | null;
  disponible: number;
};

export type LineaAsignacion = {
  inventoryItemId: string;
  ubicacionId: string;
  codigoUbicacion: string;
  loteCodigo: string | null;
  vencimiento: string | null;
  cantidad: number;
};

export type RequerimientoKit = {
  productoId: string;
  porKit: number;
};

export type DemandaParaReparto = {
  id: string;
  prioridad: string;
  fechaRequerida: string | null;
  createdAt: string;
  kitsSolicitados: number;
};

export function ordenarFefo(candidatos: CandidatoSaldo[]): CandidatoSaldo[] {
  return [...candidatos].sort((a, b) => {
    const va = a.vencimiento;
    const vb = b.vencimiento;
    if (va && vb && va !== vb) {
      return va < vb ? -1 : 1;
    }
    if (va && !vb) {
      return -1;
    }
    if (!va && vb) {
      return 1;
    }
    return a.codigoUbicacion.localeCompare(b.codigoUbicacion);
  });
}

export function asignarCantidad(
  necesidad: number,
  candidatos: CandidatoSaldo[],
): { lineas: LineaAsignacion[]; cubierto: number; deficit: number } {
  const lineas: LineaAsignacion[] = [];
  let resto = necesidad;
  for (const candidato of ordenarFefo(candidatos)) {
    if (resto <= 0.001) {
      break;
    }
    const cupo = Math.min(resto, candidato.disponible);
    if (cupo <= 0.001) {
      continue;
    }
    lineas.push({
      inventoryItemId: candidato.inventoryItemId,
      ubicacionId: candidato.ubicacionId,
      codigoUbicacion: candidato.codigoUbicacion,
      loteCodigo: candidato.loteCodigo,
      vencimiento: candidato.vencimiento,
      cantidad: cupo,
    });
    resto -= cupo;
  }
  const cubierto = necesidad - Math.max(0, resto);
  return { lineas, cubierto, deficit: Math.max(0, resto) };
}

/** Máximo de kits que el stock disponible puede armar. */
export function maxKits(
  requerimientos: RequerimientoKit[],
  disponiblePorProducto: Map<string, number>,
): number {
  if (requerimientos.length === 0) {
    return 0;
  }
  let tope = Number.POSITIVE_INFINITY;
  for (const req of requerimientos) {
    if (req.porKit <= 0) {
      continue;
    }
    const hay = disponiblePorProducto.get(req.productoId) ?? 0;
    tope = Math.min(tope, Math.floor((hay + 1e-9) / req.porKit));
  }
  if (!Number.isFinite(tope)) {
    return 0;
  }
  return Math.max(0, tope);
}

/**
 * Reparte kits posibles entre demandas abiertas: primero prioridad,
 * después fecha requerida, después antigüedad. Greedy, no proporcional.
 */
export function repartirKitsEscasos(
  demandas: DemandaParaReparto[],
  kitsPosibles: number,
): Array<{ demandaId: string; kits: number; deficit: number }> {
  const ordenadas = [...demandas].sort((a, b) => {
    const pa = ORDEN_PRIORIDAD[a.prioridad] ?? 9;
    const pb = ORDEN_PRIORIDAD[b.prioridad] ?? 9;
    if (pa !== pb) {
      return pa - pb;
    }
    if (a.fechaRequerida && b.fechaRequerida && a.fechaRequerida !== b.fechaRequerida) {
      return a.fechaRequerida < b.fechaRequerida ? -1 : 1;
    }
    if (a.fechaRequerida && !b.fechaRequerida) {
      return -1;
    }
    if (!a.fechaRequerida && b.fechaRequerida) {
      return 1;
    }
    return a.createdAt < b.createdAt ? -1 : 1;
  });
  let resto = kitsPosibles;
  return ordenadas.map((demanda) => {
    const kits = Math.min(demanda.kitsSolicitados, Math.max(0, resto));
    resto -= kits;
    return {
      demandaId: demanda.id,
      kits,
      deficit: Math.max(0, demanda.kitsSolicitados - kits),
    };
  });
}
