import type { LecturaProducto } from './types.js';

/** Parsea el JSON que devolvieron los modelos y lo normaliza al contrato. */
export function parseLecturaProducto(raw: string): LecturaProducto | null {
  let parsed: {
    nombre?: unknown;
    marca?: unknown;
    cantidad?: unknown;
    ean?: unknown;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }

  const nombre = typeof parsed.nombre === 'string' ? parsed.nombre.trim() : '';
  const marca = typeof parsed.marca === 'string' ? parsed.marca.trim() : '';
  const cantidad =
    typeof parsed.cantidad === 'number' && Number.isFinite(parsed.cantidad)
      ? parsed.cantidad
      : Number(parsed.cantidad);
  const eanDigits = typeof parsed.ean === 'string' ? parsed.ean.replace(/\D/g, '') : '';

  return {
    nombre: nombre || null,
    marca: marca || null,
    cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1,
    ean: eanDigits.length >= 8 && eanDigits.length <= 14 ? eanDigits : null,
  };
}

export function toDataUrl(bytes: Uint8Array, contentType: string): string {
  const mime = contentType.startsWith('image/') ? contentType : 'image/jpeg';
  const b64 = Buffer.from(bytes).toString('base64');
  return `data:${mime};base64,${b64}`;
}
