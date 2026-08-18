import type { Acopio, InventoryItem, Putaway } from '@soschoco/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import {
  confirmarPutaway,
  crearPutaway,
  listarPendientesUbicar,
  type PlanPutaway,
  sugerirUbicaciones,
} from '@/features/ubicaciones/ubicaciones-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const ACOPIO_KEY = 'soschoco.inventoryAcopio';
const selectClass =
  'min-h-11 w-full cursor-pointer rounded-md border border-border bg-card px-3.5 text-sm font-medium text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function PutawayPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const writable = can('inventory:write');
  const [acopios, setAcopios] = useState<Acopio[]>([]);
  const [acopioId, setAcopioId] = useState(() => localStorage.getItem(ACOPIO_KEY) ?? '');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [activo, setActivo] = useState<InventoryItem | null>(null);
  const [plan, setPlan] = useState<PlanPutaway | null>(null);
  const [tarea, setTarea] = useState<Putaway | null>(null);
  const [codigos, setCodigos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    void request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`)
      .then((list) => {
        const activos = list.filter((row) => row.isActive !== false);
        setAcopios(activos);
        setAcopioId((actual) => {
          if (actual && activos.some((row) => row.id === actual)) {
            return actual;
          }
          return activos[0]?.id ?? '';
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('inventory.loadAcopiosError'));
      });
  }, [orgId, request, t]);

  useEffect(() => {
    if (!acopioId) {
      setItems([]);
      setCargando(false);
      return;
    }
    localStorage.setItem(ACOPIO_KEY, acopioId);
    setCargando(true);
    void listarPendientesUbicar(request, orgId, acopioId)
      .then(setItems)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('putaway.loadError'));
      })
      .finally(() => setCargando(false));
  }, [acopioId, orgId, request, t]);

  const abrir = async (item: InventoryItem) => {
    setError(null);
    setActivo(item);
    setTarea(null);
    setPlan(await sugerirUbicaciones(request, orgId, acopioId, item.id));
  };

  const asignar = async () => {
    if (!activo || !plan || plan.plan.length === 0) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const created = await crearPutaway(
        request,
        orgId,
        acopioId,
        activo.id,
        plan.plan.map((linea) => ({
          destinoUbicacionId: linea.ubicacionId,
          cantidad: linea.cantidad,
        })),
      );
      setTarea(created);
      setCodigos(Object.fromEntries(created.lineas.map((linea) => [linea.id, ''])));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('putaway.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const confirmar = async () => {
    if (!tarea) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await confirmarPutaway(
        request,
        orgId,
        acopioId,
        tarea.id,
        tarea.lineas.map((linea) => ({
          lineaId: linea.id,
          codigoDestino: codigos[linea.id] ?? '',
        })),
      );
      setActivo(null);
      setPlan(null);
      setTarea(null);
      setItems(await listarPendientesUbicar(request, orgId, acopioId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('putaway.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('locations.noPermission')}</p>;
  }

  return (
    <div className="space-y-8 py-2">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <button type="button" className="linkish" onClick={() => navigate(ROUTES.inventario)}>
            {t('inventory.title')}
          </button>
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{t('putaway.title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('putaway.subtitle')}</p>
      </div>

      <label className="flex max-w-sm flex-col gap-1.5">
        <span className="text-sm font-medium">{t('inventory.acopioPicker')}</span>
        <select
          className={selectClass}
          value={acopioId}
          onChange={(e) => setAcopioId(e.target.value)}
        >
          {acopios.map((row) => (
            <option key={row.id} value={row.id}>
              {row.nombre}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {t('common.loading')}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('putaway.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium text-foreground">{item.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {(item.cantidadEnMuelle ?? item.cantidad).toString()} {item.unidad}
                  {item.loteCodigo ? ` · ${item.loteCodigo}` : ''}
                  {item.vencimiento ? ` · ${item.vencimiento.slice(0, 10)}` : ''}
                </p>
              </div>
              {writable ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    void abrir(item).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : t('putaway.loadError'));
                    })
                  }
                >
                  {t('putaway.assign')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {activo && plan && !tarea ? (
        <section className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium">
            {t('putaway.suggested')} · {activo.nombre}
          </h2>
          <p className="text-sm text-muted-foreground">{t('putaway.splitHint')}</p>
          {plan.sugeridas.length === 0 ? (
            <p className="text-sm text-warning">{t('putaway.noSuggestions')}</p>
          ) : (
            <ul className="space-y-2">
              {plan.sugeridas.map((row) => (
                <li key={row.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  <span className="font-medium">{row.codigo}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {row.nombre} ·{' '}
                    {row.disponibleUnidades == null
                      ? t('putaway.unlimited')
                      : t('putaway.available', { qty: row.disponibleUnidades })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {plan.plan.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('putaway.plan')}</p>
              <ul className="text-sm text-muted-foreground">
                {plan.plan.map((linea) => (
                  <li key={linea.ubicacionId}>
                    {linea.codigo} → {linea.cantidad}
                  </li>
                ))}
              </ul>
              <Button disabled={guardando} onClick={() => void asignar()}>
                {guardando ? t('common.saving') : t('putaway.assign')}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {tarea ? (
        <section className="space-y-4 rounded-lg border border-accent p-4">
          <h2 className="text-lg font-medium">
            {t('putaway.confirmTitle', { code: tarea.codigo })}
          </h2>
          <p className="text-sm text-muted-foreground">{t('putaway.scanHint')}</p>
          {tarea.lineas.map((linea) => (
            <label key={linea.id} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {linea.origenCodigo} → {linea.destinoCodigo} · {linea.cantidad}
              </span>
              <Input
                value={codigos[linea.id] ?? ''}
                onChange={(e) =>
                  setCodigos((actual) => ({ ...actual, [linea.id]: e.target.value }))
                }
                placeholder={linea.destinoCodigo}
                autoCapitalize="characters"
              />
            </label>
          ))}
          <Button disabled={guardando} onClick={() => void confirmar()}>
            {guardando ? t('common.saving') : t('putaway.confirm')}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
