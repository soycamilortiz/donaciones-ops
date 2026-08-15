import type { DonacionImagen, Producto, RutaSubida } from '@soschoco/shared';
import { upload } from '@vercel/blob/client';

/**
 * Cliente del módulo de donaciones.
 *
 * El archivo no pasa por el API: se pide una ruta, el SDK de Vercel Blob negocia
 * el token contra `/subidas` y sube directo. Recién entonces se registra la
 * imagen, que es lo que encola el reconocimiento.
 */

export type Peticion = <T>(path: string, init?: RequestInit) => Promise<T>;

const base = (orgId: string) => `/api/v1/organizations/${orgId}/donaciones`;

export function listarImagenes(
  request: Peticion,
  orgId: string,
  estado?: string,
): Promise<DonacionImagen[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return request<DonacionImagen[]>(`${base(orgId)}${query}`);
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
 * Sube la foto y la registra. Devuelve la imagen recién creada, todavía en
 * estado PENDIENTE: el reconocimiento ocurre en el worker.
 */
export async function subirFoto(
  request: Peticion,
  orgId: string,
  archivo: File,
  opciones: { token: string | null; acopioId?: string },
): Promise<DonacionImagen> {
  const ruta = await request<RutaSubida>(`${base(orgId)}/subidas/ruta`, {
    method: 'POST',
    body: JSON.stringify({ nombreArchivo: archivo.name }),
  });

  if (archivo.size > ruta.maxBytes) {
    throw new Error(`La foto pesa más de ${Math.round(ruta.maxBytes / 1024 / 1024)} MB`);
  }
  if (!ruta.tiposAceptados.includes(archivo.type)) {
    throw new Error(`Formato no aceptado: ${archivo.type || 'desconocido'}`);
  }

  const blob = await upload(ruta.pathname, archivo, {
    access: 'public',
    handleUploadUrl: `${base(orgId)}/subidas`,
    // El endpoint que emite el token exige JWT como cualquier otro del API.
    headers: opciones.token ? { Authorization: `Bearer ${opciones.token}` } : undefined,
  });

  return request<DonacionImagen>(base(orgId), {
    method: 'POST',
    body: JSON.stringify({
      pathname: ruta.pathname,
      blobUrl: blob.url,
      acopioId: opciones.acopioId,
    }),
  });
}
