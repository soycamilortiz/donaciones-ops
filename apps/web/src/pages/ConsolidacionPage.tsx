import type { Consolidacion, PipelineDemanda } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import {
  crearConsolidacion,
  getPipeline,
  listarConsolidaciones,
  propuestaPallets,
} from '@/features/consolidacion/consolidacion-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

export default function ConsolidacionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const writable = can('inventory:write');
  const [pipeline, setPipeline] = useState<PipelineDemanda | null>(null);
  const [rows, setRows] = useState<Consolidacion[]>([]);
  const [propuesta, setPropuesta] = useState<{
    kits: number;
    kitsPorPallet: number;
    pallets: number;
    pesoPalletKg: number;
    altoPalletM: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) {
      return;
    }
    try {
      const [pipe, lista, plan] = await Promise.all([
        getPipeline(request, orgId, id),
        listarConsolidaciones(request, orgId, id),
        propuestaPallets(request, orgId, id).catch(() => null),
      ]);
      setPipeline(pipe);
      setRows(lista);
      setPropuesta(plan);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('consolidation.loadError'));
    } finally {
      setCargando(false);
    }
  }, [id, orgId, request, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('consolidation.noPermission')}</p>;
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
      <button
        type="button"
        className="linkish"
        onClick={() => id && navigate(ROUTES.demandaDetalle(id))}
      >
        {t('consolidation.back')}
      </button>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('consolidation.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('consolidation.subtitle')}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {pipeline ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['solicitado', pipeline.solicitado],
              ['reservado', pipeline.reservado],
              ['pendientePick', pipeline.pendientePick],
              ['armado', pipeline.armado],
              ['aprobado', pipeline.aprobado],
              ['observado', pipeline.observado],
              ['rechazado', pipeline.rechazado],
              ['consolidado', pipeline.consolidado],
              ['palletizado', pipeline.palletizado],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-border bg-card p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t(`consolidation.pipe.${key}`)}
              </dt>
              <dd className="text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {propuesta ? (
        <section className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">{t('consolidation.proposalTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('consolidation.proposalLine', {
              kits: propuesta.kits,
              per: propuesta.kitsPorPallet,
              pallets: propuesta.pallets,
              weight: propuesta.pesoPalletKg,
            })}
          </p>
          {writable && propuesta.kits > 0 ? (
            <Button
              type="button"
              disabled={ocupado || !id}
              onClick={() => {
                if (!id) {
                  return;
                }
                setOcupado(true);
                void crearConsolidacion(request, orgId, id)
                  .then(cargar)
                  .catch((err) =>
                    setError(err instanceof Error ? err.message : t('consolidation.saveError')),
                  )
                  .finally(() => setOcupado(false));
              }}
            >
              {t('consolidation.create')}
            </Button>
          ) : null}
        </section>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('consolidation.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {row.codigo} · {row.destinoNombre} · {row.kits} kits
                </p>
                <Badge>{t(`consolidation.estado.${row.estado}`)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('consolidation.proposalLine', {
                  kits: row.kits,
                  per: row.propuesta.kitsPorPallet,
                  pallets: row.propuesta.pallets,
                  weight: row.propuesta.pesoPalletKg,
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
