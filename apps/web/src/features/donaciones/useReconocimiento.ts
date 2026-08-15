import type { DonacionImagen } from '@soschoco/shared';
import { DonacionImagenEstado } from '@soschoco/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerImagen, type Peticion } from './donaciones-service';

/** Estados en los que el worker todavía no terminó. */
const EN_CURSO: string[] = [DonacionImagenEstado.Pendiente, DonacionImagenEstado.Procesando];

export function estaEnCurso(imagen: DonacionImagen | null): boolean {
  return imagen !== null && EN_CURSO.includes(imagen.estado);
}

export type OpcionesPolling = {
  intervaloMs?: number;
  /** Deja de consultar pasado este tiempo, para no golpear el API sin fin. */
  limiteMs?: number;
};

/**
 * Consulta el estado de una imagen hasta que el worker la resuelve.
 *
 * Es polling y no websocket a propósito: el reconocimiento tarda segundos, no
 * minutos, y en campo la conexión se cae — reintentar una petición simple es
 * mucho más robusto que sostener un socket.
 */
export function useReconocimiento(
  request: Peticion,
  orgId: string,
  imagenId: string | null,
  opciones: OpcionesPolling = {},
) {
  const { intervaloMs = 2000, limiteMs = 90_000 } = opciones;

  const [imagen, setImagen] = useState<DonacionImagen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expirado, setExpirado] = useState(false);

  // En una ref para que cambiarla no reinicie el efecto en cada render.
  const inicioRef = useRef<number>(0);

  const consultar = useCallback(async () => {
    if (!imagenId) {
      return null;
    }
    const actual = await obtenerImagen(request, orgId, imagenId);
    setImagen(actual);
    return actual;
  }, [request, orgId, imagenId]);

  useEffect(() => {
    if (!imagenId) {
      setImagen(null);
      setError(null);
      setExpirado(false);
      return;
    }

    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout>;
    inicioRef.current = Date.now();
    setExpirado(false);
    setError(null);

    const tic = async () => {
      try {
        const actual = await consultar();
        if (cancelado || !actual) {
          return;
        }
        if (!EN_CURSO.includes(actual.estado)) {
          return; // el worker terminó
        }
        if (Date.now() - inicioRef.current > limiteMs) {
          setExpirado(true);
          return;
        }
        temporizador = setTimeout(() => void tic(), intervaloMs);
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'No se pudo consultar el estado');
        }
      }
    };

    void tic();

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [imagenId, consultar, intervaloMs, limiteMs]);

  return {
    imagen,
    error,
    expirado,
    enCurso: estaEnCurso(imagen),
    refrescar: consultar,
    setImagen,
  };
}
