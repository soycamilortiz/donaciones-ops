import type {
  Demanda,
  KitInstancia,
  PipelineDemanda,
  PlanEscaso,
  Reserva,
  SimulacionReserva,
} from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { useOrg } from '@/components/OrgGate';
import {
  armarKits,
  getPipeline,
  listarKitsArmados,
} from '@/features/consolidacion/consolidacion-service';
import {
  cancelarDemanda,
  confirmarReserva,
  crearReserva,
  getDemanda,
  liberarReserva,
  listarReservas,
  planEscaso,
  simularReserva,
} from '@/features/reservas/reservas-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const PRIORIDAD_VARIANTE: Record<string, BadgeVariant> = {
  CRITICA: 'error',
  ALTA: 'warning',
  MEDIA: 'info',
  BAJA: 'secondary',
};

const ESTADO_VARIANTE: Record<string, BadgeVariant> = {
  ABIERTA: 'info',
  PARCIAL: 'warning',
  CUBIERTA: 'success',
  CANCELADA: 'error',
  CERRADA: 'secondary',
};

const RESERVA_VARIANTE: Record<string, BadgeVariant> = {
  PRE_RESERVA: 'warning',
  RESERVADA: 'success',
  LIBERADA: 'secondary',
  CANCELADA: 'error',
  CONSUMIDA: 'info',
};

const KIT_INSTANCIA_VARIANTE: Record<string, BadgeVariant> = {
  PENDIENTE_PICK: 'warning',
  ARMADO: 'info',
  EN_CONTROL: 'warning',
  APROBADO: 'success',
  OBSERVADO: 'warning',
  RECHAZADO: 'error',
  CONSOLIDADO: 'secondary',
};

const KITS_ARMADOS_VISIBLES = 100;

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function DemandaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const writable = can('inventory:write');
  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [pipeline, setPipeline] = useState<PipelineDemanda | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [kitsArmados, setKitsArmados] = useState<KitInstancia[]>([]);
  const [plan, setPlan] = useState<PlanEscaso | null>(null);
  const [sims, setSims] = useState<Record<string, SimulacionReserva>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const [liberarId, setLiberarId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!id) {
      return;
    }
    try {
      const row = await getDemanda(request, orgId, id);
      const [todas, escaso, pipe, instancias] = await Promise.all([
        listarReservas(request, orgId, row.acopioId),
        planEscaso(request, orgId, row.acopioId).catch(() => null),
        getPipeline(request, orgId, id).catch(() => null),
        listarKitsArmados(request, orgId, id).catch(() => [] as KitInstancia[]),
      ]);
      setDemanda(row);
      setReservas(todas.filter((reserva) => reserva.demandaId === row.id));
      setKitsArmados(instancias);
      setPlan(escaso);
      setPipeline(pipe);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('demands.loadError'));
    } finally {
      setCargando(false);
    }
  }, [id, request, orgId, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const simular = async (itemId: string) => {
    if (!id) {
      return;
    }
    try {
      const sim = await simularReserva(request, orgId, id, itemId);
      setSims((prev) => ({ ...prev, [itemId]: sim }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('demands.saveError'));
    }
  };

  const reservar = async (itemId: string, firme: boolean) => {
    if (!id) {
      return;
    }
    setOcupado(true);
    try {
      await crearReserva(request, orgId, id, { demandaItemId: itemId, firme });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('demands.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('demands.noPermission')}</p>;
  }

  if (cargando) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="space-y-6 py-2">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!demanda) {
    return (
      <p role="alert" className="py-8 text-sm text-error">
        {error ?? t('demands.loadError')}
      </p>
    );
  }

  const abierta = demanda.estado === 'ABIERTA' || demanda.estado === 'PARCIAL';
  const reservasConKits = new Set(kitsArmados.map((kit) => kit.reservaId));
  const kitsVisibles = kitsArmados.slice(0, KITS_ARMADOS_VISIBLES);

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-2">
        <button type="button" className="linkish" onClick={() => navigate(ROUTES.demandas)}>
          {t('demands.back')}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {demanda.codigo}
            </p>
            <h1 className="text-2xl font-semibold text-foreground">{demanda.destinoNombre}</h1>
            <p className="text-sm text-muted-foreground">
              {demanda.acopioNombre}
              {demanda.destinoMunicipio ? ` · ${demanda.destinoMunicipio}` : ''}
              {demanda.fechaRequerida ? ` · ${demanda.fechaRequerida}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={PRIORIDAD_VARIANTE[demanda.prioridad] ?? 'secondary'}>
              {t(`demands.prioridad.${demanda.prioridad}`)}
            </Badge>
            <Badge variant={ESTADO_VARIANTE[demanda.estado] ?? 'secondary'}>
              {t(`demands.estado.${demanda.estado}`)}
            </Badge>
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-foreground">
        {t('demands.coverageLine', { pct: pct(demanda.cobertura ?? 0) })}
      </p>

      {pipeline ? (
        <p className="text-sm text-muted-foreground">
          {t('demands.pipelineLine', {
            reserved: pipeline.reservado,
            pendingPick: pipeline.pendientePick,
            armed: pipeline.armado,
            approved: pipeline.aprobado,
            pending: Math.max(0, pipeline.armado - pipeline.aprobado - pipeline.rechazado),
          })}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(pipeline?.pendientePick ?? 0) > 0 ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(ROUTES.demandaPicking(demanda.id))}
          >
            {t('demands.openPicking', { count: pipeline?.pendientePick ?? 0 })}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(ROUTES.demandaControl(demanda.id))}
        >
          {t('demands.openControl')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(ROUTES.demandaConsolidacion(demanda.id))}
        >
          {t('demands.openConsolidation')}
        </Button>
        {(pipeline?.consolidado ?? 0) > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.demandaPalletizacion(demanda.id))}
          >
            {t('demands.openPalletization')}
          </Button>
        ) : null}
      </div>

      {demanda.items.map((item) => {
        const sim = sims[item.id];
        const posible = item.cantidadPosible ?? sim?.posible ?? 0;
        const pendiente = Math.max(0, item.cantidadSolicitada - item.cantidadCubierta);
        return (
          <section key={item.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {item.tipo === 'KIT'
                    ? `${item.kitCodigo ?? ''} ${item.kitNombre ?? ''}`.trim()
                    : (item.productoNombre ?? t('demands.productLine'))}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('demands.itemCounts', {
                    requested: item.cantidadSolicitada,
                    reserved: item.cantidadCubierta,
                    possible: posible,
                    pending: pendiente,
                  })}
                </p>
              </div>
              {writable && abierta && pendiente > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => void simular(item.id)}>
                    {t('demands.simulate')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={ocupado || posible <= 0}
                    onClick={() => void reservar(item.id, false)}
                  >
                    {t('demands.preReserve')}
                  </Button>
                  <Button
                    type="button"
                    disabled={ocupado || posible <= 0}
                    onClick={() => void reservar(item.id, true)}
                  >
                    {t('demands.reserve')}
                  </Button>
                </div>
              ) : null}
            </div>
            {sim ? (
              <ul className="space-y-2 text-sm">
                {sim.requerimientos.map((req) => (
                  <li key={req.productoId}>
                    <span className="font-medium">{req.productoNombre}</span>
                    {': '}
                    {t('demands.requirementLine', {
                      needed: req.requerido,
                      available: req.disponible,
                      covered: req.cubierto,
                    })}
                    {req.productosSustitutos && req.productosSustitutos.length > 0 ? (
                      <span className="block text-xs text-muted-foreground">
                        {t('demands.substitutes', {
                          names: req.productosSustitutos.map((row) => row.nombre).join(', '),
                        })}
                      </span>
                    ) : null}
                    {req.plan.length > 0 ? (
                      <ul className="mt-1 ml-4 list-disc text-muted-foreground">
                        {req.plan.map((linea) => (
                          <li key={`${linea.ubicacionId}-${linea.inventoryItemId}`}>
                            {linea.ubicacionCodigo}
                            {linea.loteCodigo ? ` · ${linea.loteCodigo}` : ''}
                            {linea.vencimiento ? ` · ${linea.vencimiento}` : ''}
                            {`: ${linea.cantidad}`}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('demands.reservationsTitle')}</h2>
        {reservas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('demands.reservationsEmpty')}</p>
        ) : (
          <ul className="space-y-3">
            {reservas.map((reserva) => (
              <li
                key={reserva.id}
                className="space-y-2 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {reserva.codigo} · {reserva.cantidad}
                    </p>
                    <Badge variant={RESERVA_VARIANTE[reserva.estado] ?? 'secondary'}>
                      {t(`demands.reservaEstado.${reserva.estado}`)}
                    </Badge>
                  </div>
                  {writable ? (
                    <div className="flex gap-2">
                      {reserva.estado === 'PRE_RESERVA' ? (
                        <Button
                          type="button"
                          disabled={ocupado}
                          onClick={() => {
                            setOcupado(true);
                            void confirmarReserva(request, orgId, reserva.id)
                              .then(cargar)
                              .catch((err) =>
                                setError(
                                  err instanceof Error ? err.message : t('demands.saveError'),
                                ),
                              )
                              .finally(() => setOcupado(false));
                          }}
                        >
                          {t('demands.confirm')}
                        </Button>
                      ) : null}
                      {reserva.estado === 'RESERVADA' && !reservasConKits.has(reserva.id) ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={ocupado}
                          onClick={() => {
                            setOcupado(true);
                            void armarKits(request, orgId, reserva.id)
                              .then(cargar)
                              .catch((err) =>
                                setError(
                                  err instanceof Error ? err.message : t('demands.saveError'),
                                ),
                              )
                              .finally(() => setOcupado(false));
                          }}
                        >
                          {t('demands.assemble')}
                        </Button>
                      ) : null}
                      {reserva.estado === 'PRE_RESERVA' || reserva.estado === 'RESERVADA' ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setLiberarId(reserva.id)}
                        >
                          {t('demands.release')}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {reserva.items.map((linea) => (
                    <li key={linea.id}>
                      {linea.productoNombre}: {linea.cantidadAsignada}/{linea.cantidadRequerida}
                      {linea.asignaciones.map((asig) => (
                        <span
                          key={asig.id ?? `${asig.ubicacionId}-${asig.inventoryItemId}`}
                          className="ml-2"
                        >
                          {asig.ubicacionCodigo}
                          {asig.loteCodigo ? ` · ${asig.loteCodigo}` : ''} ({asig.cantidad})
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('demands.assembledKitsTitle')}</h2>
        {kitsArmados.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('demands.assembledKitsEmpty')}</p>
        ) : (
          <>
            {kitsArmados.length > KITS_ARMADOS_VISIBLES ? (
              <p className="text-sm text-muted-foreground">
                {t('demands.assembledKitsTruncated', {
                  shown: KITS_ARMADOS_VISIBLES,
                  total: kitsArmados.length,
                })}
              </p>
            ) : null}
            <ul className="space-y-2">
              {kitsVisibles.map((kit) => (
                <li key={kit.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {kit.codigo}
                      {kit.kitNombre ? ` · ${kit.kitNombre}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={KIT_INSTANCIA_VARIANTE[kit.estado] ?? 'secondary'}>
                        {t(`demands.kitEstado.${kit.estado}`)}
                      </Badge>
                      {kit.estado === 'PENDIENTE_PICK' ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate(ROUTES.demandaPicking(demanda.id, kit.id))}
                        >
                          {t('demands.pickKit')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {kit.items.length > 0 ? (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        {t('demands.assembledKitsComposition', { count: kit.items.length })}
                      </summary>
                      <ul className="mt-2 space-y-0.5 pl-4 text-muted-foreground">
                        {kit.items.map((item) => (
                          <li key={item.id}>
                            {t('picking.itemDetail', {
                              product: item.productoNombre ?? item.productoId,
                              qty: item.cantidad,
                              origen: item.origenUbicacionCodigo ?? '—',
                              lot: item.loteCodigo ? ` · ${item.loteCodigo}` : '',
                            })}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {plan && plan.lineas.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold text-foreground">{t('demands.scarceTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('demands.scarceHint', { count: plan.kitsPosibles })}
          </p>
          <ul className="space-y-1 text-sm">
            {plan.lineas.map((linea) => (
              <li key={`${linea.demandaId}-${linea.demandaCodigo}`}>
                {linea.demandaCodigo} · {linea.destinoNombre} ·{' '}
                {t(`demands.prioridad.${linea.prioridad}`)}
                {': '}
                {t('demands.scarceLine', {
                  proposed: linea.propuesto,
                  requested: linea.solicitado,
                  deficit: linea.deficit,
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {writable && abierta ? (
        <Button type="button" variant="outline" onClick={() => setCancelar(true)}>
          {t('demands.cancelDemand')}
        </Button>
      ) : null}

      <ConfirmDialog
        abierto={cancelar}
        titulo={t('demands.cancelTitle')}
        descripcion={t('demands.cancelHint')}
        etiquetaConfirmar={t('demands.cancelDemand')}
        etiquetaCancelar={t('common.cancel')}
        onCancelar={() => setCancelar(false)}
        onConfirmar={() => {
          if (!id) {
            return;
          }
          void cancelarDemanda(request, orgId, id)
            .then(() => {
              setCancelar(false);
              return cargar();
            })
            .catch((err) => setError(err instanceof Error ? err.message : t('demands.saveError')));
        }}
      />
      <ConfirmDialog
        abierto={liberarId !== null}
        titulo={t('demands.releaseTitle')}
        descripcion={t('demands.releaseHint')}
        etiquetaConfirmar={t('demands.release')}
        etiquetaCancelar={t('common.cancel')}
        onCancelar={() => setLiberarId(null)}
        onConfirmar={() => {
          if (!liberarId) {
            return;
          }
          setOcupado(true);
          void liberarReserva(request, orgId, liberarId)
            .then(() => {
              setLiberarId(null);
              return cargar();
            })
            .catch((err) => setError(err instanceof Error ? err.message : t('demands.saveError')))
            .finally(() => setOcupado(false));
        }}
      />
    </div>
  );
}
