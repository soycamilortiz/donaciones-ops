import type { Peticion } from '@/features/transporte/transporte-service';

export type RutaParada = {
  sequence: number;
  nombre: string;
  destinoNombre?: string;
};

export type Ruta = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  paradas: RutaParada[];
};

function org(orgId: string) {
  return `/organizations/${orgId}`;
}

export async function listarRutas(request: Peticion, orgId: string): Promise<Ruta[]> {
  return request<Ruta[]>(`${org(orgId)}/rutas`);
}

export async function crearRuta(
  request: Peticion,
  orgId: string,
  body: { nombre: string; descripcion?: string; paradas: RutaParada[] },
): Promise<Ruta> {
  return request<Ruta>(`${org(orgId)}/rutas`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
