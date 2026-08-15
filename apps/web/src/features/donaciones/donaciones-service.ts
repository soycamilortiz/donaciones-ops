import {
  type DonacionImagen,
  normalizarTipoImagen,
  type Pagina,
  type Producto,
  type RutaSubida,
} from '@soschoco/shared';

/**
 * Cliente del módulo de donaciones.
 *
 * El archivo no pasa por el API: se pide una URL firmada de R2, se hace PUT
 * al bucket y recién entonces se registra la imagen (eso encola el OCR).
 */

export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

const base = (orgId: string) => `/api/v1/organizations/${orgId}/donaciones`;

export function listarImagenes(
  request: Peticion,
  orgId: string,
  opciones: { estado?: string; cursor?: string; limite?: number } = {},
): Promise<Pagina<DonacionImagen>> {
  const query = new URLSearchParams();
  if (opciones.estado) query.set('estado', opciones.estado);
  if (opciones.cursor) query.set('cursor', opciones.cursor);
  if (opciones.limite) query.set('limite', String(opciones.limite));
  const sufijo = query.size > 0 ? `?${query}` : '';
  return request<Pagina<DonacionImagen>>(`${base(orgId)}${sufijo}`);
}

export function obtenerImagen(
  request: Peticion,
  orgId: string,
  id: string,
): Promise<DonacionImagen> {
  return request<DonacionImagen>(`${base(orgId)}/${id}`);
}

export function listarProductos(request: Peticion, orgId: string): Promise<Producto[]> {
  return request<Producto[]>(`${base(orgId)}/productos`);
}

export function corregirProducto(
  request: Peticion,
  orgId: string,
  id: string,
  productoId: string,
): Promise<DonacionImagen> {
  return request<DonacionImagen>(`${base(orgId)}/${id}/producto`, {
    method: 'PATCH',
    body: JSON.stringify({ productoId }),
  });
}

export function reprocesar(request: Peticion, orgId: string, id: string): Promise<DonacionImagen> {
  return request<DonacionImagen>(`${base(orgId)}/${id}/reprocesar`, { method: 'POST' });
}

/**
 * Sube la foto a R2 y la registra. Devuelve la imagen en PENDIENTE: el
 * reconocimiento ocurre en el worker.
 */
export async function subirFoto(
  request: Peticion,
  orgId: string,
  archivo: File,
  opciones: { token: string | null; acopioId?: string },
): Promise<DonacionImagen> {
  const contentType = normalizarTipoImagen(archivo.type, archivo.name);
  if (!contentType) {
    throw new Error(`Formato no aceptado: ${archivo.type || 'desconocido'}`);
  }

  const ruta = await request<RutaSubida>(`${base(orgId)}/subidas/ruta`, {
    method: 'POST',
    body: JSON.stringify({
      nombreArchivo: archivo.name,
      contentType,
    }),
  });

  if (archivo.size > ruta.maxBytes) {
    throw new Error(`La foto pesa más de ${Math.round(ruta.maxBytes / 1024 / 1024)} MB`);
  }

  const subida = await fetch(ruta.uploadUrl, {
    method: 'PUT',
    body: archivo,
    headers: ruta.headers,
  });
  if (!subida.ok) {
    throw new Error(`No se pudo subir la foto a R2 (HTTP ${subida.status})`);
  }

  return request<DonacionImagen>(base(orgId), {
    method: 'POST',
    body: JSON.stringify({
      pathname: ruta.pathname,
      acopioId: opciones.acopioId,
    }),
  });
}
