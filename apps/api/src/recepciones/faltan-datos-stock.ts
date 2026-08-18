export function faltaVencimientoObligatorio(
  producto: { requiereVencimiento: boolean },
  lote: { vencimiento: Date | null } | null,
): boolean {
  return producto.requiereVencimiento && !lote?.vencimiento;
}
