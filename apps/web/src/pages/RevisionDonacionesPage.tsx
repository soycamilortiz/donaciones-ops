import type { DonacionImagen, Producto } from '@soschoco/shared';
import { DonacionImagenEstado } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import {
  corregirProducto,
  listarImagenes,
  listarProductos,
  reprocesar,
} from '@/features/donaciones/donaciones-service';
import { useApi } from '@/lib/useApi';

/**
 * Cola de revisión manual.
 *
 * El reconocimiento deja a propósito sin producto todo lo que no supera el
 * umbral de certeza, en vez de arriesgar un dato equivocado en el inventario.
 * Esta pantalla es donde esas fotos se resuelven.
 */
export default function RevisionDonacionesPage() {
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();

  const [pendientes, setPendientes] = useState<DonacionImagen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [pagina, catalogo] = await Promise.all([
        // 200 es el tope del API; la cola de revisión rara vez pasa de ahí.
        listarImagenes(request, orgId, { limite: 200 }),
        listarProductos(request, orgId),
      ]);
      const imagenes = pagina.items;
      // Necesitan mano humana: procesadas sin producto, o fallidas.
      setPendientes(
        imagenes.filter(
          (imagen) =>
            (imagen.estado === DonacionImagenEstado.Procesada && !imagen.producto) ||
            imagen.estado === DonacionImagenEstado.Fallida,
        ),
      );
      setProductos(catalogo);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('review.loadError'));
    } finally {
      setCargando(false);
    }
  }, [request, orgId, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const asignar = async (imagenId: string, productoId: string) => {
    if (!productoId) {
      return;
    }
    setGuardando(imagenId);
    try {
      await corregirProducto(request, orgId, imagenId, productoId);
      setPendientes((actuales) => actuales.filter((imagen) => imagen.id !== imagenId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('review.saveError'));
    } finally {
      setGuardando(null);
    }
  };

  const reintentar = async (imagenId: string) => {
    setGuardando(imagenId);
    try {
      await reprocesar(request, orgId, imagenId);
      setPendientes((actuales) => actuales.filter((imagen) => imagen.id !== imagenId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('review.retryError'));
    } finally {
      setGuardando(null);
    }
  };

  if (!can('donaciones:write')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('review.noPermission')}</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('review.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('review.subtitle')}</p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {t('common.loading')}
        </p>
      ) : pendientes.length === 0 ? (
        <div className="space-y-1 rounded-lg border border-border p-6 text-center">
          <p className="text-sm font-medium text-foreground">{t('review.emptyTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('review.emptyHint')}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {pendientes.map((imagen) => (
            <li
              key={imagen.id}
              className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row"
            >
              <img
                src={imagen.blobUrl}
                alt={t('review.photoAlt')}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-32 w-32 shrink-0 rounded object-cover"
              />

              <div className="flex-1 space-y-3">
                {imagen.estado === DonacionImagenEstado.Fallida ? (
                  <div className="space-y-1">
                    <Badge variant="error">{t('review.failed')}</Badge>
                    {imagen.error ? (
                      <p className="text-xs text-muted-foreground">{imagen.error}</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Badge variant="warning">{t('review.unidentified')}</Badge>
                    {imagen.textoOcr ? (
                      <p className="text-xs text-muted-foreground">
                        {t('review.ocrText')} <span className="font-mono">{imagen.textoOcr}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('review.noText')}</p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <label className="sr-only" htmlFor={`producto-${imagen.id}`}>
                    {t('review.correctProduct')}
                  </label>
                  <select
                    id={`producto-${imagen.id}`}
                    className="min-h-11 cursor-pointer rounded border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    defaultValue=""
                    disabled={guardando === imagen.id}
                    onChange={(event) => void asignar(imagen.id, event.target.value)}
                  >
                    <option value="">{t('review.chooseProduct')}</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre}
                        {producto.marca ? ` — ${producto.marca}` : ''}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    disabled={guardando === imagen.id}
                    onClick={() => void reintentar(imagen.id)}
                  >
                    Reintentar reconocimiento
                  </Button>

                  {guardando === imagen.id ? <Spinner /> : null}
                </div>

                {productos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('review.emptyCatalog')}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
