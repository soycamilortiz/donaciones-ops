/**
 * Control por muestreo y propuesta de pallets (sin empaquetar en 3D).
 */

export type LoteParaKit = {
  productoId: string;
  inventoryItemId: string;
  origenUbicacionId: string;
  loteCodigo: string | null;
  vencimiento: string | null;
  cantidad: number;
};

export type RecetaLinea = {
  productoId: string;
  porKit: number;
};

export type KitComposicionLinea = {
  productoId: string;
  inventoryItemId: string;
  origenUbicacionId: string;
  loteCodigo: string | null;
  vencimiento: string | null;
  cantidad: number;
};

/** Reparte los lotes de la reserva entre N kits, FEFO, cubriendo el BOM de cada uno. */
export function componerKits(
  nKits: number,
  receta: RecetaLinea[],
  lotes: LoteParaKit[],
): KitComposicionLinea[][] {
  const kits: KitComposicionLinea[][] = Array.from({ length: nKits }, () => []);
  const pool = lotes.map((row) => ({ ...row }));
  for (const linea of receta) {
    if (linea.porKit <= 0) {
      continue;
    }
    const propios = pool
      .filter((row) => row.productoId === linea.productoId)
      .sort((a, b) => {
        if (a.vencimiento && b.vencimiento && a.vencimiento !== b.vencimiento) {
          return a.vencimiento < b.vencimiento ? -1 : 1;
        }
        if (a.vencimiento && !b.vencimiento) {
          return -1;
        }
        if (!a.vencimiento && b.vencimiento) {
          return 1;
        }
        return 0;
      });
    for (let i = 0; i < nKits; i += 1) {
      let falta = linea.porKit;
      for (const lote of propios) {
        if (falta <= 0.001) {
          break;
        }
        const cupo = Math.min(falta, lote.cantidad);
        if (cupo <= 0.001) {
          continue;
        }
        kits[i]?.push({
          productoId: linea.productoId,
          inventoryItemId: lote.inventoryItemId,
          origenUbicacionId: lote.origenUbicacionId,
          loteCodigo: lote.loteCodigo,
          vencimiento: lote.vencimiento,
          cantidad: cupo,
        });
        lote.cantidad -= cupo;
        falta -= cupo;
      }
    }
  }
  return kits;
}

export function tamanioMuestra(total: number, porcentaje: number): number {
  if (total <= 0) {
    return 0;
  }
  const pct = Math.min(1, Math.max(0, porcentaje));
  return Math.min(total, Math.max(1, Math.round(total * pct)));
}

export function elegirMuestra(ids: string[], n: number, seed = 1): string[] {
  const copia = [...ids];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = copia[i];
    const b = copia[j];
    if (a !== undefined && b !== undefined) {
      copia[i] = b;
      copia[j] = a;
    }
  }
  return copia.slice(0, Math.min(n, copia.length));
}

export type EvaluacionControl = {
  inspeccionados: number;
  defectuosos: number;
  tasaDefecto: number;
  requiereTotal: boolean;
};

/** OBSERVADO y RECHAZADO cuentan como defecto para el umbral de muestreo. */
export function evaluarMuestreo(
  resultados: string[],
  umbral: number,
  modo: string,
): EvaluacionControl {
  const hechos = resultados.filter((row) => row !== 'PENDIENTE');
  const defectuosos = hechos.filter((row) => row === 'RECHAZADO' || row === 'OBSERVADO').length;
  const tasa = hechos.length > 0 ? defectuosos / hechos.length : 0;
  const muestraCompleta = resultados.length > 0 && hechos.length === resultados.length;
  return {
    inspeccionados: hechos.length,
    defectuosos,
    tasaDefecto: tasa,
    requiereTotal:
      modo === 'MUESTREO' && muestraCompleta && hechos.length > 0 && tasa > umbral + 1e-9,
  };
}

export type PropuestaPallet = {
  kitsPorPallet: number;
  pallets: number;
  ultimoPalletKits: number;
  pesoPalletKg: number;
  altoPalletM: number | null;
  limitePorPeso: number;
  limitePorAlto: number | null;
};

export function proponerPallets(input: {
  nKits: number;
  kitPesoKg: number;
  palletPesoMaxKg: number;
  kitAltoM?: number | null;
  palletAltoMaxM?: number | null;
}): PropuestaPallet {
  const pesoKit = Math.max(0.001, input.kitPesoKg);
  const pesoMax = Math.max(pesoKit, input.palletPesoMaxKg);
  const limitePorPeso = Math.max(1, Math.floor(pesoMax / pesoKit + 1e-9));
  let limitePorAlto: number | null = null;
  if (input.kitAltoM && input.palletAltoMaxM && input.kitAltoM > 0) {
    limitePorAlto = Math.max(1, Math.floor(input.palletAltoMaxM / input.kitAltoM + 1e-9));
  }
  const kitsPorPallet = limitePorAlto ? Math.min(limitePorPeso, limitePorAlto) : limitePorPeso;
  const n = Math.max(0, input.nKits);
  const pallets = n === 0 ? 0 : Math.ceil(n / kitsPorPallet);
  const ultimo = n === 0 ? 0 : n - kitsPorPallet * (pallets - 1);
  const alto =
    input.kitAltoM && kitsPorPallet > 0
      ? Number((input.kitAltoM * kitsPorPallet).toFixed(3))
      : null;
  return {
    kitsPorPallet,
    pallets,
    ultimoPalletKits: ultimo,
    pesoPalletKg: Number((kitsPorPallet * pesoKit).toFixed(3)),
    altoPalletM: alto,
    limitePorPeso,
    limitePorAlto,
  };
}
