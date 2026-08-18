import type { Despacho } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { SkeletonList } from '@/components/atoms/Skeleton';
import { useOrg } from '@/components/OrgGate';
import { listarDespachosOrg } from '@/features/despacho/despacho-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

export default function DespachosPage() {
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const [rows, setRows] = useState<Despacho[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const data = await listarDespachosOrg(request, orgId);
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('despachos.loadError'));
    } finally {
      setCargando(false);
    }
  }, [orgId, request, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('despachos.noPermission')}</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('despachos.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('despachos.subtitle')}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
      {cargando ? (
        <SkeletonList filas={4} etiqueta={t('common.loading')} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('despachos.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('despachos.colCodigo')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('despachos.colDestino')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('despachos.colKits')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('despachos.colPallets')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('despachos.colEstado')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('despachos.colDemanda')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-mono">
                    <Link className="linkish" to={ROUTES.demandaCarga(row.demandaId, row.planId)}>
                      {row.codigo}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.destinoNombre}</td>
                  <td className="px-3 py-2">
                    {row.kitsCargados}/{row.kitsEsperados}
                  </td>
                  <td className="px-3 py-2">
                    {row.palletsCargados}/{row.palletsEsperados}
                  </td>
                  <td className="px-3 py-2">
                    <Badge>{t(`cargo.estado.${row.estado}`)}</Badge>
                  </td>
                  <td className="px-3 py-2 font-mono">{row.demandaCodigo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
