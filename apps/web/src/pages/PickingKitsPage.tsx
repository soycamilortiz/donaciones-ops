import type { KitInstancia } from '@soschoco/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { SkeletonList } from '@/components/atoms/Skeleton';
import { FormField } from '@/components/molecules/FormField';
import { useToast } from '@/components/molecules/Toast';
import { useOrg } from '@/components/OrgGate';
import {
  confirmarKitArmado,
  confirmarPickLinea,
  listarKitsArmados,
} from '@/features/consolidacion/consolidacion-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const ESTADO_VARIANTE: Record<string, BadgeVariant> = {
  PENDIENTE_PICK: 'warning',
  ARMADO: 'info',
  EN_CONTROL: 'warning',
  APROBADO: 'success',
};

export default function PickingKitsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const { avisar } = useToast();
  const writable = can('inventory:write');
  const [kits, setKits] = useState<KitInstancia[]>([]);
  const [activo, setActivo] = useState<KitInstancia | null>(null);
  const [codigos, setCodigos] = useState<Record<string, { origen: string; destino: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const pendientes = useMemo(() => kits.filter((kit) => kit.estado === 'PENDIENTE_PICK'), [kits]);

  const cargar = useCallback(async () => {
    if (!id) {
      return;
    }
    try {
      const rows = await listarKitsArmados(request, orgId, id);
      setKits(rows);
      const kitId = searchParams.get('kit');
      const elegido =
        rows.find((row) => row.id === kitId) ??
        rows.find((row) => row.estado === 'PENDIENTE_PICK') ??
        rows[0] ??
        null;
      setActivo(elegido);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('picking.loadError'));
    } finally {
      setCargando(false);
    }
  }, [id, orgId, request, searchParams, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!activo) {
      return;
    }
    setCodigos((prev) => {
      const next = { ...prev };
      for (const linea of activo.items) {
        if (!next[linea.id]) {
          next[linea.id] = {
            origen: linea.origenUbicacionCodigo ?? '',
            destino: activo.zonaKittingCodigo ?? '',
          };
        }
      }
      return next;
    });
  }, [activo]);

  const seleccionarKit = (kit: KitInstancia) => {
    setActivo(kit);
    setSearchParams({ kit: kit.id });
  };

  const confirmarLinea = async (itemId: string) => {
    if (!activo) {
      return;
    }
    const codes = codigos[itemId];
    if (!codes?.origen.trim() || !codes?.destino.trim()) {
      setError(t('picking.codesRequired'));
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const actualizado = await confirmarPickLinea(request, orgId, activo.id, itemId, {
        codigoOrigen: codes.origen.trim(),
        codigoDestino: codes.destino.trim(),
      });
      setActivo(actualizado);
      setKits((prev) => prev.map((row) => (row.id === actualizado.id ? actualizado : row)));
      // Confirmar una línea solo le ponía una insignia: se pierde de vista al
      // recorrer una lista larga con el móvil, y se vuelve a confirmar.
      avisar(t('picking.lineOk'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('picking.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const confirmarKit = async () => {
    if (!activo) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const actualizado = await confirmarKitArmado(request, orgId, activo.id);
      setActivo(actualizado);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('picking.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('picking.noPermission')}</p>;
  }

  const lineasPendientes = activo?.items.filter((row) => !row.pickConfirmadoAt) ?? [];
  const listoParaArmar =
    activo?.estado === 'PENDIENTE_PICK' && activo.items.length > 0 && lineasPendientes.length === 0;

  return (
    <div className="space-y-6 py-2">
      <button
        type="button"
        className="linkish"
        onClick={() => id && navigate(ROUTES.demandaDetalle(id))}
      >
        {t('picking.back')}
      </button>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('picking.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('picking.subtitle')}</p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <SkeletonList filas={3} etiqueta={t('common.loading')} />
      ) : pendientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('picking.empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {pendientes.slice(0, 50).map((kit) => (
            <Button
              key={kit.id}
              type="button"
              variant={activo?.id === kit.id ? 'primary' : 'outline'}
              onClick={() => seleccionarKit(kit)}
            >
              {kit.codigo}
            </Button>
          ))}
          {pendientes.length > 50 ? (
            <span className="self-center text-sm text-muted-foreground">
              {t('picking.truncated', { total: pendientes.length })}
            </span>
          ) : null}
        </div>
      )}

      {activo ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">
                {activo.codigo}
                {activo.kitNombre ? ` · ${activo.kitNombre}` : ''}
              </h2>
              {activo.zonaKittingCodigo ? (
                <p className="text-sm text-muted-foreground">
                  {t('picking.destinoLine', { code: activo.zonaKittingCodigo })}
                </p>
              ) : null}
            </div>
            <Badge variant={ESTADO_VARIANTE[activo.estado] ?? 'secondary'}>
              {t(`demands.kitEstado.${activo.estado}`)}
            </Badge>
          </div>

          <ol className="space-y-4">
            {[...activo.items]
              .sort((a, b) =>
                (a.origenUbicacionCodigo ?? '').localeCompare(b.origenUbicacionCodigo ?? ''),
              )
              .map((linea, index) => (
                <li
                  key={linea.id}
                  className="space-y-3 rounded-md border border-border p-3"
                  aria-current={!linea.pickConfirmadoAt && index === 0 ? 'step' : undefined}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {t('picking.lineTitle', {
                          product: linea.productoNombre ?? linea.productoId,
                          qty: linea.cantidad,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('picking.lineHint', {
                          origen: linea.origenUbicacionCodigo ?? '—',
                          lote: linea.loteCodigo ? ` · ${linea.loteCodigo}` : '',
                        })}
                      </p>
                    </div>
                    {linea.pickConfirmadoAt ? (
                      <Badge variant="success">{t('picking.lineDone')}</Badge>
                    ) : null}
                  </div>

                  {writable && !linea.pickConfirmadoAt ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label={t('picking.codigoOrigen')} htmlFor={`origen-${linea.id}`}>
                        <Input
                          id={`origen-${linea.id}`}
                          value={codigos[linea.id]?.origen ?? ''}
                          onChange={(event) =>
                            setCodigos((prev) => ({
                              ...prev,
                              [linea.id]: {
                                origen: event.target.value,
                                destino: prev[linea.id]?.destino ?? activo.zonaKittingCodigo ?? '',
                              },
                            }))
                          }
                          autoComplete="off"
                        />
                      </FormField>
                      <FormField label={t('picking.codigoDestino')} htmlFor={`destino-${linea.id}`}>
                        <Input
                          id={`destino-${linea.id}`}
                          value={codigos[linea.id]?.destino ?? ''}
                          onChange={(event) =>
                            setCodigos((prev) => ({
                              ...prev,
                              [linea.id]: {
                                origen: prev[linea.id]?.origen ?? linea.origenUbicacionCodigo ?? '',
                                destino: event.target.value,
                              },
                            }))
                          }
                          autoComplete="off"
                        />
                      </FormField>
                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          disabled={ocupado}
                          onClick={() => void confirmarLinea(linea.id)}
                        >
                          {t('picking.confirmLine')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
          </ol>

          {writable && listoParaArmar ? (
            <Button type="button" disabled={ocupado} onClick={() => void confirmarKit()}>
              {t('picking.confirmKit')}
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
