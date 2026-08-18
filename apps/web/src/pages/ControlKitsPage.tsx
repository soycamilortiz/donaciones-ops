import type { ControlLote, Reserva } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import {
  crearControl,
  expandirControlTotal,
  inspeccionarKit,
  listarControles,
} from '@/features/consolidacion/consolidacion-service';
import { getDemanda, listarReservas } from '@/features/reservas/reservas-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const RESULTADO_VARIANTE: Record<string, BadgeVariant> = {
  PENDIENTE: 'warning',
  APROBADO: 'success',
  OBSERVADO: 'info',
  RECHAZADO: 'error',
};

export default function ControlKitsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const writable = can('inventory:write');
  const [controles, setControles] = useState<ControlLote[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [activo, setActivo] = useState<ControlLote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) {
      return;
    }
    try {
      const demanda = await getDemanda(request, orgId, id);
      const [rows, todas] = await Promise.all([
        listarControles(request, orgId, id),
        listarReservas(request, orgId, demanda.acopioId),
      ]);
      setControles(rows);
      setActivo((prev) => rows.find((row) => row.id === prev?.id) ?? rows[0] ?? null);
      setReservas(todas.filter((row) => row.demandaId === id && row.estado === 'RESERVADA'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('control.loadError'));
    } finally {
      setCargando(false);
    }
  }, [id, orgId, request, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirControl = async (reservaId: string, modo: 'MUESTREO' | 'TOTAL') => {
    setOcupado(true);
    try {
      const creado = await crearControl(request, orgId, {
        reservaId,
        modo,
        porcentajeMuestra: 0.1,
        umbralDefecto: 0.05,
      });
      setActivo(creado);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('control.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('control.noPermission')}</p>;
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
        {t('control.back')}
      </button>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('control.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('control.subtitle')}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {writable && reservas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {reservas.map((reserva) => (
            <div key={reserva.id} className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={ocupado}
                onClick={() => void abrirControl(reserva.id, 'MUESTREO')}
              >
                {t('control.startSample', { code: reserva.codigo })}
              </Button>
              <Button
                type="button"
                disabled={ocupado}
                onClick={() => void abrirControl(reserva.id, 'TOTAL')}
              >
                {t('control.startFull', { code: reserva.codigo })}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {controles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('control.empty')}</p>
      ) : controles.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {controles.map((row) => (
            <Button
              key={row.id}
              type="button"
              variant={activo?.id === row.id ? 'primary' : 'outline'}
              onClick={() => setActivo(row)}
            >
              {row.codigo}
            </Button>
          ))}
        </div>
      ) : null}

      {activo ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {activo.codigo} · {t(`control.modo.${activo.modo}`)}
            </h2>
            <Badge variant={activo.estado === 'CERRADO' ? 'success' : 'warning'}>
              {t(`control.loteEstado.${activo.estado}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('control.stats', {
              done: activo.inspeccionados,
              total: activo.inspecciones.length,
              defects: activo.defectuosos,
              rate: `${Math.round(activo.tasaDefecto * 100)}%`,
            })}
          </p>
          {activo.requiereTotal && activo.estado !== 'CERRADO' && writable ? (
            <Button
              type="button"
              disabled={ocupado}
              onClick={() => {
                setOcupado(true);
                void expandirControlTotal(request, orgId, activo.id)
                  .then((row) => {
                    setActivo(row);
                    return cargar();
                  })
                  .catch((err) =>
                    setError(err instanceof Error ? err.message : t('control.saveError')),
                  )
                  .finally(() => setOcupado(false));
              }}
            >
              {t('control.expand')}
            </Button>
          ) : null}
          <ul className="space-y-2">
            {activo.inspecciones.map((ins) => (
              <li key={ins.id} className="space-y-2 border-b border-border py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{ins.kitCodigo}</span>
                  <Badge variant={RESULTADO_VARIANTE[ins.resultado] ?? 'secondary'}>
                    {t(`control.resultado.${ins.resultado}`)}
                  </Badge>
                </div>
                {ins.items && ins.items.length > 0 ? (
                  <ul className="space-y-0.5 text-sm text-muted-foreground">
                    {ins.items.map((item) => (
                      <li key={item.id}>
                        {t('control.itemLine', {
                          product: item.productoNombre ?? item.productoId,
                          qty: item.cantidad,
                          lot: item.loteCodigo ? ` · ${item.loteCodigo}` : '',
                        })}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {writable && ins.resultado === 'PENDIENTE' ? (
                  <div className="flex gap-1">
                    {(['APROBADO', 'OBSERVADO', 'RECHAZADO'] as const).map((res) => (
                      <Button
                        key={res}
                        type="button"
                        variant="outline"
                        disabled={ocupado}
                        onClick={() => {
                          setOcupado(true);
                          void inspeccionarKit(request, orgId, activo.id, ins.id, res)
                            .then((row) => {
                              setActivo(row);
                              return cargar();
                            })
                            .catch((err) =>
                              setError(err instanceof Error ? err.message : t('control.saveError')),
                            )
                            .finally(() => setOcupado(false));
                        }}
                      >
                        {t(`control.resultado.${res}`)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
