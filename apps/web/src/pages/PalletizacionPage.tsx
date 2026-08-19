import type { Consolidacion, PlanPalletizacion } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { SkeletonList } from '@/components/atoms/Skeleton';
import { useOrg } from '@/components/OrgGate';
import { listarConsolidaciones } from '@/features/consolidacion/consolidacion-service';
import {
  crearPlanPalletizacion,
  listarPlanesPalletizacion,
} from '@/features/despacho/despacho-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const ESTADO_VARIANTE: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  CREADO: 'default',
  EN_CONSTRUCCION: 'warning',
  COMPLETO: 'info',
  LISTO_PARA_DESPACHO: 'success',
  CARGADO: 'success',
  DESPACHADO: 'success',
};

export default function PalletizacionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const writable = can('inventory:write');
  const [consolidaciones, setConsolidaciones] = useState<Consolidacion[]>([]);
  const [planes, setPlanes] = useState<PlanPalletizacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) {
      return;
    }
    try {
      const [cns, pln] = await Promise.all([
        listarConsolidaciones(request, orgId, id),
        listarPlanesPalletizacion(request, orgId, id),
      ]);
      setConsolidaciones(cns);
      setPlanes(pln);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('palletization.loadError'));
    } finally {
      setCargando(false);
    }
  }, [id, orgId, request, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearPlan = async (consolidacionId: string) => {
    setOcupado(true);
    setError(null);
    try {
      await crearPlanPalletizacion(request, orgId, consolidacionId);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('palletization.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('palletization.noPermission')}</p>;
  }

  const consolidacionesSinPlan = consolidaciones.filter(
    (row) => !planes.some((plan) => plan.consolidacionId === row.id),
  );

  return (
    <div className="space-y-6 py-2">
      <button
        type="button"
        className="linkish"
        onClick={() => id && navigate(ROUTES.demandaDetalle(id))}
      >
        {t('palletization.back')}
      </button>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('palletization.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('palletization.subtitle')}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {consolidacionesSinPlan.length > 0 ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">{t('palletization.createPlanTitle')}</h2>
          <ul className="space-y-2">
            {consolidacionesSinPlan.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{row.codigo}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('palletization.consolidationLine', {
                      kits: row.kits,
                      pallets: row.propuesta.pallets,
                    })}
                  </p>
                </div>
                {writable ? (
                  <Button type="button" disabled={ocupado} onClick={() => void crearPlan(row.id)}>
                    {t('palletization.createPlan')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cargando ? (
        <SkeletonList filas={3} etiqueta={t('common.loading')} />
      ) : planes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('palletization.empty')}</p>
      ) : (
        planes.map((plan) => (
          <section key={plan.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-mono text-lg font-semibold">{plan.codigo}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('palletization.planLine', {
                    destino: plan.destinoNombre,
                    pallets: plan.palletCount,
                    listos: plan.palletsListos,
                  })}
                </p>
              </div>
              {writable && plan.palletsListos > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => id && navigate(ROUTES.demandaCarga(id, plan.id))}
                >
                  {t('palletization.openCargo')}
                </Button>
              ) : null}
            </div>
            <ul className="divide-y divide-border rounded border border-border">
              {plan.slots.map((slot) => {
                // Bound to a const so the narrowing survives into the onClick closure.
                const palletId = slot.palletId;
                return (
                  <li
                    key={slot.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {slot.palletCodigo ?? `#${slot.sequence}`}
                      </span>
                      {slot.palletEstado ? (
                        <Badge variant={ESTADO_VARIANTE[slot.palletEstado] ?? 'default'}>
                          {t(`palletization.palletEstado.${slot.palletEstado}`)}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {t('palletization.progress', {
                          actual: slot.kitsActual,
                          objetivo: slot.kitsObjetivo,
                        })}
                      </span>
                      {palletId && id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(ROUTES.demandaPalletArmado(id, palletId))}
                        >
                          {t('palletization.openPallet')}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
