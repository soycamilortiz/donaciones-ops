import type { Recepcion } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import { DataTable, type DataTableColumn } from '@/components/organisms/DataTable';
import { listarRecepciones } from '@/features/recepciones/recepciones-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const ESTADO_VARIANTE: Record<string, BadgeVariant> = {
  BORRADOR: 'secondary',
  EN_RECEPCION: 'info',
  EN_INSPECCION: 'warning',
  PENDIENTE_VALIDACION: 'warning',
  VALIDADA: 'success',
  CERRADA: 'secondary',
  ANULADA: 'error',
};

type Fila = Recepcion & Record<string, unknown>;

export default function RecepcionesPage() {
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const rows = await listarRecepciones(request, orgId);
      setFilas(rows as Fila[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('receptions.loadError'));
    } finally {
      setCargando(false);
    }
  }, [request, orgId, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const columns: DataTableColumn<Fila>[] = [
    {
      key: 'codigo',
      header: t('receptions.columns.code'),
      render: (row) => (
        <button
          type="button"
          className="linkish font-medium"
          onClick={() => navigate(ROUTES.recepcionDetalle(row.id))}
        >
          {row.codigo}
        </button>
      ),
    },
    {
      key: 'acopioNombre',
      header: t('receptions.columns.acopio'),
      render: (row) => row.acopioNombre ?? '—',
    },
    {
      key: 'tipo',
      header: t('receptions.columns.type'),
      render: (row) => t(`receptions.tipo.${row.tipo}`),
    },
    {
      key: 'estado',
      header: t('receptions.columns.status'),
      render: (row) => (
        <Badge variant={ESTADO_VARIANTE[row.estado] ?? 'secondary'}>
          {t(`receptions.estado.${row.estado}`)}
        </Badge>
      ),
    },
    {
      key: 'items',
      header: t('receptions.columns.lines'),
      render: (row) => String(row.items.length),
    },
    {
      key: 'recibidaEn',
      header: t('receptions.columns.received'),
      render: (row) => new Date(row.recibidaEn).toLocaleString(),
    },
  ];

  if (!can('donaciones:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('receptions.noPermission')}</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('receptions.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('receptions.subtitle')}</p>
        </div>
        {can('donaciones:write') ? (
          <Button onClick={() => navigate(ROUTES.nuevaRecepcion)}>{t('receptions.open')}</Button>
        ) : null}
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
      ) : (
        <DataTable
          columns={columns}
          data={filas}
          caption={t('receptions.tableCaption')}
          emptyMessage={t('receptions.empty')}
        />
      )}
    </div>
  );
}
