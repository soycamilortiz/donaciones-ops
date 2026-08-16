/**
 * Canonical product names so “Agua Brisa 600 ml” and “botella de agua brisa”
 * land on the same inventory row.
 */

const RUIDO = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'botella',
  'botellas',
  'pack',
  'paquete',
  'paquetes',
  'unidad',
  'unidades',
  'ml',
  'l',
  'lt',
  'litro',
  'litros',
  'gr',
  'g',
  'kg',
  'x',
]);

export function normalizarNombreProducto(texto: string): string {
  const sinAcento = texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const tokens = sinAcento
    .split(/\s+/)
    .filter((t) => t.length > 0 && !RUIDO.has(t) && !/^\d+$/.test(t));
  return [...new Set(tokens)].sort().join(' ');
}

export function similitudNombres(a: string, b: string): number {
  const na = normalizarNombreProducto(a);
  const nb = normalizarNombreProducto(b);
  if (!na || !nb) {
    return 0;
  }
  if (na === nb) {
    return 1;
  }
  const ta = new Set(na.split(' '));
  const tb = new Set(nb.split(' '));
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) {
      inter += 1;
    }
  }
  const dice = (2 * inter) / (ta.size + tb.size);
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const edit = maxLen === 0 ? 1 : 1 - dist / maxLen;
  return dice * 0.65 + edit * 0.35;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    let prev = dp[0] ?? 0;
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = dp[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min((dp[j] ?? 0) + 1, (dp[j - 1] ?? 0) + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n] ?? 0;
}

/** Above this we treat two labels as the same SKU. */
export const UMBRAL_MISMO_PRODUCTO = 0.82;
