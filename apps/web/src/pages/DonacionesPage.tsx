import type { DonacionImagen } from '@soschoco/shared';
import { DonacionImagenEstado } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Spinner } from '@/components/atoms/Spinner';
import { StatCard } from '@/components/molecules/StatCard';
import { useOrg } from '@/components/OrgGate';
import { DataTable, type DataTableColumn } from '@/components/organisms/DataTable';
import { listarImagenes } from '@/features/donaciones/donaciones-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

/** Solo el color: la etiqueta sale del catálogo de traducciones. */
const ESTADO_VARIANTE: Record<string, BadgeVariant> = {
  [DonacionImagenEstado.Pendiente]: 'secondary',
  [DonacionImagenEstado.Procesando]: 'info',
  [DonacionImagenEstado.Procesada]: 'success',
  [DonacionImagenEstado.Fallida]: 'error',
};

type Fila = DonacionImagen & Record<string, unknown>;

export default function DonacionesPage() {
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();

  const [imagenes, setImagenes] = useState<Fila[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const pagina = await listarImagenes(request, orgId);
      setImagenes(pagina.items as Fila[]);
      setCursor(pagina.siguienteCursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('donations.loadError'));
    } finally {
      setCargando(false);
    }
  }, [request, orgId, t]);

  const cargarMas = useCallback(async () => {
    if (!cursor) {
      return;
    }
    setCargandoMas(true);
    try {
      const pagina = await listarImagenes(request, orgId, { cursor });
      setImagenes((previas) => [...previas, ...(pagina.items as Fila[])]);
      setCursor(pagina.siguienteCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('donations.loadMoreError'));
    } finally {
      setCargandoMas(false);
    }
  }, [request, orgId, cursor, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Si hay algo en cola, refresca solo: el worker termina en segundos.
  useEffect(() => {
    const enCurso = imagenes.some(
      (fila) =>
        fila.estado === DonacionImagenEstado.Pendiente ||
        fila.estado === DonacionImagenEstado.Procesando,
    );
    if (!enCurso) {
      return;
    }
    const id = setTimeout(() => void cargar(), 4000);
    return () => clearTimeout(id);
  }, [imagenes, cargar]);

  const columns: DataTableColumn<Fila>[] = [
    {
      key: 'blobUrl',
      header: t('donations.columns.photo'),
      render: (fila) => (
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary">
          <img
            src={fila.blobUrl}
            alt={t('donations.columns.photo')}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </span>
      ),
    },
    {
      key: 'producto',
      header: t('donations.columns.product'),
      render: (fila) =>
        fila.producto ? (
          <span className="font-medium">{fila.producto.nombre}</span>
        ) : (
          <span className="text-muted-foreground">{t('donations.unidentified')}</span>
        ),
    },
    {
      key: 'acopio',
      header: t('donations.columns.acopio'),
      render: (fila) =>
        fila.acopio ? (
          fila.acopio.nombre
        ) : (
          <span className="text-muted-foreground">{t('common.unspecified')}</span>
        ),
    },
    {
      key: 'confianza',
      header: t('donations.columns.confidence'),
      align: 'right',
      render: (fila) =>
        typeof fila.confianza === 'number' ? `${Math.round(fila.confianza * 100)}%` : '—',
    },
    {
      key: 'estado',
      header: t('donations.columns.status'),
      render: (fila) => (
        <Badge variant={ESTADO_VARIANTE[fila.estado] ?? 'default'}>
          {t(`donations.status.${fila.estado}` as 'donations.status.PENDIENTE', {
            defaultValue: fila.estado,
          })}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: t('donations.columns.date'),
      align: 'right',
      render: (fila) => new Date(fila.createdAt).toLocaleDateString('es-CO'),
    },
  ];

  const procesadas = imagenes.filter((f) => f.estado === DonacionImagenEstado.Procesada);
  const porRevisar = procesadas.filter((f) => !f.producto).length;
  const fallidas = imagenes.filter((f) => f.estado === DonacionImagenEstado.Fallida).length;
  const enCola = imagenes.length - procesadas.length - fallidas;

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('donations.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('donations.subtitle')}</p>
        </div>
        {can('donaciones:write') ? (
          <Button onClick={() => navigate(ROUTES.nuevaDonacion)}>{t('donations.register')}</Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('donations.stats.photos')}
          value={String(imagenes.length)}
          icon="heart"
        />
        <StatCard
          label={t('donations.stats.recognized')}
          value={String(procesadas.length - porRevisar)}
          icon="check"
        />
        <StatCard
          label={t('donations.stats.toReview')}
          value={String(porRevisar)}
          icon="info"
          className={porRevisar > 0 ? 'border-warning/30 bg-warning-soft' : undefined}
        />
        <StatCard
          label={t('donations.stats.queued')}
          value={String(Math.max(enCola, 0))}
          icon="settings"
        />
      </div>

      {porRevisar > 0 && can('donaciones:write') ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-warning/30 bg-warning-soft p-4">
          <Icon name="info" className="shrink-0 text-warning" />
          <p className="flex-1 text-sm font-semibold text-foreground">
            {t('donations.pendingReview', { count: porRevisar })}
          </p>
          <Button variant="outline" onClick={() => navigate(ROUTES.revisionDonaciones)}>
            {t('donations.reviewAction')}
            <Icon name="chevron-right" size={16} />
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {t('common.loading')}
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={imagenes}
            caption={t('donations.tableCaption')}
            emptyMessage={t('donations.emptyTable')}
          />
          {cursor ? (
            <div className="flex justify-center">
              <Button variant="outline" disabled={cargandoMas} onClick={() => void cargarMas()}>
                {cargandoMas ? t('common.loading') : t('donations.loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
