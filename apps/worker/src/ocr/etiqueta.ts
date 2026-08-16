/**
 * Extrae un nombre y una cantidad tentativos del texto sucio de Tesseract.
 * El operador siempre confirma; esto solo rellena el formulario.
 */
export function parsearEtiqueta(texto: string): { nombre: string; cantidad: number } {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea) => linea.replace(/\s+/g, ' ').trim())
    .filter((linea) => linea.length >= 2);

  const plano = lineas.join(' ');
  const match =
    plano.match(/x\s*(\d{1,4})/i) ??
    plano.match(/(\d{1,4})\s*x/i) ??
    plano.match(/cantidad\s*[:.]?\s*(\d{1,4})/i) ??
    plano.match(/pack\s*(?:de\s*)?(\d{1,4})/i);

  const extraido = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;
  const cantidad = Number.isFinite(extraido) && extraido > 0 ? extraido : 1;

  let nombre = lineas[0] ?? plano;
  if (match?.[0]) {
    nombre = nombre.replace(match[0], ' ').replace(/\s+/g, ' ').trim() || nombre;
  }
  if (nombre.length > 160) {
    nombre = nombre.slice(0, 160).trim();
  }

  return { nombre: nombre || 'Producto donado', cantidad };
}
