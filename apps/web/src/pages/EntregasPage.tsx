import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import {
  listarEntregasPendientes,
  type EntregaPendiente,
} from '@/features/entrega/entrega-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

export default function EntregasPage() {
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const [rows, setRows] = useState<EntregaPendiente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const data = await listarEntregasPendientes(request, orgId);
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('entregas.loadError'));
    } finally {
      setCargando(false);
    }
  }, [orgId, request, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('entregas.noPermission')}</p>;
  }

  if (cargando) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> {t('common.loading')}
      </p>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('entregas.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('entregas.subtitle')}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('entregas.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t('entregas.colViaje')}</th>
                <th className="px-3 py-2 font-medium">{t('entregas.colDespacho')}</th>
                <th className="px-3 py-2 font-medium">{t('entregas.colDestino')}</th>
                <th className="px-3 py-2 font-medium">{t('entregas.colKits')}</th>
                <th className="px-3 py-2 font-medium">{t('entregas.colSalida')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.viajeId}>
                  <td className="px-3 py-2 font-mono">
                    <Link className="linkish" to={ROUTES.entregaDetalle(row.viajeId)}>
                      {row.viajeCodigo}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono">{row.despachoCodigo}</td>
                  <td className="px-3 py-2">{row.destinoNombre ?? '—'}</td>
                  <td className="px-3 py-2">{row.kitsCargados}</td>
                  <td className="px-3 py-2">
                    {row.salidaReal ? new Date(row.salidaReal).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
