import type { Acopio, InventoryItem, InventoryMovimiento, Ubicacion } from '@soschoco/shared';
import {
  categoriaCompatible,
  destinoAdmiteReubicacion,
  origenAdmiteReubicacion,
} from '@soschoco/shared';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { FormField } from '@/components/molecules/FormField';
import { useOrg } from '@/components/OrgGate';
import {
  listarMovimientos,
  listarUbicaciones,
  reubicarInventario,
} from '@/features/ubicaciones/ubicaciones-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const ACOPIO_KEY = 'soschoco.inventoryAcopio';
const selectClass =
  'flex h-11 w-full cursor-pointer appearance-none rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function balancesMovibles(item: InventoryItem) {
  return (item.balances ?? []).filter(
    (row) => origenAdmiteReubicacion(row.funcion) && row.cantidad > 0,
  );
}

export default function MovimientosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const writable = can('inventory:write');
  const [params, setParams] = useSearchParams();
  const itemParam = params.get('item') ?? '';

  const [acopios, setAcopios] = useState<Acopio[]>([]);
  const [acopioId, setAcopioId] = useState(
    () => params.get('acopio') || localStorage.getItem(ACOPIO_KEY) || '',
  );
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [historial, setHistorial] = useState<InventoryMovimiento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [itemId, setItemId] = useState(itemParam);
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [codigoDestino, setCodigoDestino] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const movibles = useMemo(() => items.filter((row) => balancesMovibles(row).length > 0), [items]);
  const activo = movibles.find((row) => row.id === itemId) ?? null;
  const origenes = activo ? balancesMovibles(activo) : [];
  const origen = origenes.find((row) => row.ubicacionId === origenId);
  const destinos = useMemo(() => {
    if (!activo) {
      return [];
    }
    return ubicaciones.filter((row) => {
      if (row.id === origenId) {
        return false;
      }
      if (row.estado !== 'ACTIVA' || !row.isActive) {
        return false;
      }
      if (!destinoAdmiteReubicacion(row.funcion)) {
        return false;
      }
      return categoriaCompatible(activo.categoria, row);
    });
  }, [activo, ubicaciones, origenId]);
  const destino = destinos.find((row) => row.id === destinoId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: params only seed the first acopio pick
  useEffect(() => {
    void request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`)
      .then((list) => {
        const activos = list.filter((row) => row.isActive !== false);
        setAcopios(activos);
        setAcopioId((actual) => {
          const preferido = params.get('acopio') || actual;
          if (preferido && activos.some((row) => row.id === preferido)) {
            return preferido;
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
      setUbicaciones([]);
      setHistorial([]);
      setCargando(false);
      return;
    }
    localStorage.setItem(ACOPIO_KEY, acopioId);
    setCargando(true);
    void Promise.all([
      request<InventoryItem[]>(`/api/v1/organizations/${orgId}/acopios/${acopioId}/inventory`),
      listarUbicaciones(request, orgId, acopioId),
      listarMovimientos(request, orgId, acopioId),
    ])
      .then(([stock, zonas, movs]) => {
        setItems(stock.filter((row) => row.isActive !== false));
        setUbicaciones(zonas);
        setHistorial(movs);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('movimientos.loadError'));
      })
      .finally(() => setCargando(false));
  }, [acopioId, orgId, request, t]);

  useEffect(() => {
    if (!acopioId) {
      return;
    }
    const next = new URLSearchParams();
    next.set('acopio', acopioId);
    if (itemId) {
      next.set('item', itemId);
    }
    if (params.get('acopio') !== acopioId || (params.get('item') ?? '') !== itemId) {
      setParams(next, { replace: true });
    }
  }, [acopioId, itemId, params, setParams]);

  useEffect(() => {
    if (!itemId || origenId) {
      return;
    }
    const row = items.find((item) => item.id === itemId);
    if (!row) {
      return;
    }
    const primero = balancesMovibles(row)[0];
    setOrigenId(primero?.ubicacionId ?? '');
    setCantidad(primero ? String(primero.cantidad) : '');
  }, [itemId, items, origenId]);

  function elegirItem(row: InventoryItem) {
    const primero = balancesMovibles(row)[0];
    setItemId(row.id);
    setOrigenId(primero?.ubicacionId ?? '');
    setDestinoId('');
    setCantidad(primero ? String(primero.cantidad) : '');
    setCodigoDestino('');
    setObservaciones('');
  }

  function elegirOrigen(id: string) {
    setOrigenId(id);
    const row = origenes.find((item) => item.ubicacionId === id);
    if (row) {
      setCantidad(String(row.cantidad));
    }
  }

  async function onMover(event: FormEvent) {
    event.preventDefault();
    if (!activo || !origen || !destino || !writable) {
      return;
    }
    const qty = Number(cantidad);
    if (!Number.isFinite(qty) || qty <= 0) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await reubicarInventario(request, orgId, acopioId, {
        inventoryItemId: activo.id,
        origenUbicacionId: origen.ubicacionId,
        destinoUbicacionId: destino.id,
        cantidad: qty,
        codigoDestino,
        observaciones: observaciones.trim() || undefined,
      });
      setCodigoDestino('');
      const [stock, zonas, movs] = await Promise.all([
        request<InventoryItem[]>(`/api/v1/organizations/${orgId}/acopios/${acopioId}/inventory`),
        listarUbicaciones(request, orgId, acopioId),
        listarMovimientos(request, orgId, acopioId),
      ]);
      const activos = stock.filter((row) => row.isActive !== false);
      setItems(activos);
      setUbicaciones(zonas);
      setHistorial(movs);
      const actualizado = activos.find((row) => row.id === activo.id);
      const rest = actualizado
        ? balancesMovibles(actualizado).find((b) => b.ubicacionId === origen.ubicacionId)
        : undefined;
      if (rest) {
        setCantidad(String(rest.cantidad));
      } else if (actualizado && balancesMovibles(actualizado).length > 0) {
        elegirItem(actualizado);
      } else {
        setItemId('');
        setOrigenId('');
        setDestinoId('');
        setCantidad('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('movimientos.saveError'));
    } finally {
      setGuardando(false);
    }
  }

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
        <h1 className="text-2xl font-semibold text-foreground">{t('movimientos.title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('movimientos.subtitle')}</p>
      </div>

      <FormField label={t('inventory.acopioPicker')} htmlFor="mov-acopio" className="max-w-sm">
        <select
          id="mov-acopio"
          className={selectClass}
          value={acopioId}
          onChange={(e) => {
            setItemId('');
            setOrigenId('');
            setDestinoId('');
            setAcopioId(e.target.value);
          }}
        >
          {acopios.map((row) => (
            <option key={row.id} value={row.id}>
              {row.nombre}
            </option>
          ))}
        </select>
      </FormField>

      {error ? (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {t('common.loading')}
        </p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('movimientos.itemsTitle')}
            </h2>
            {movibles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                {t('movimientos.empty')}
              </p>
            ) : (
              <ul className="space-y-2">
                {movibles.map((row) => {
                  const activoFila = row.id === itemId;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={`w-full rounded-lg border px-4 py-3 text-left ${
                          activoFila
                            ? 'border-accent bg-secondary'
                            : 'border-border bg-card hover:bg-secondary/60'
                        }`}
                        onClick={() => elegirItem(row)}
                      >
                        <span className="block font-medium text-foreground">{row.nombre}</span>
                        <span className="block text-sm text-muted-foreground">
                          {balancesMovibles(row)
                            .map((b) => `${b.codigo} · ${b.cantidad} ${row.unidad}`)
                            .join(' · ')}
                          {row.loteCodigo ? ` · ${row.loteCodigo}` : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {writable && activo ? (
            <form
              className="space-y-4 rounded-lg border border-border bg-card p-5"
              onSubmit={onMover}
            >
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {t('movimientos.formTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">{t('movimientos.confirmHint')}</p>
              <FormField label={t('movimientos.origin')} htmlFor="mov-origen">
                <select
                  id="mov-origen"
                  className={selectClass}
                  value={origenId}
                  onChange={(e) => elegirOrigen(e.target.value)}
                >
                  {origenes.map((row) => (
                    <option key={row.ubicacionId} value={row.ubicacionId}>
                      {row.codigo} · {row.nombre} ({row.cantidad})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t('movimientos.destination')} htmlFor="mov-destino">
                <select
                  id="mov-destino"
                  className={selectClass}
                  value={destinoId}
                  onChange={(e) => {
                    setDestinoId(e.target.value);
                    setCodigoDestino('');
                  }}
                  required
                >
                  <option value="">{t('movimientos.destinationPlaceholder')}</option>
                  {destinos.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.codigo} · {row.nombre}
                      {row.disponibleUnidades != null
                        ? ` · ${t('putaway.available', { qty: row.disponibleUnidades })}`
                        : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              {destinos.length === 0 ? (
                <p className="text-sm text-warning">{t('movimientos.noDestinations')}</p>
              ) : null}
              <FormField label={t('inventory.quantity')} htmlFor="mov-qty" required>
                <Input
                  id="mov-qty"
                  type="number"
                  min={0.001}
                  step="any"
                  max={origen?.cantidad}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                />
              </FormField>
              <FormField label={t('movimientos.confirmCode')} htmlFor="mov-codigo" required>
                <Input
                  id="mov-codigo"
                  value={codigoDestino}
                  onChange={(e) => setCodigoDestino(e.target.value)}
                  placeholder={destino?.codigo ?? 'ALI-01'}
                  autoCapitalize="characters"
                  required
                />
              </FormField>
              <FormField label={t('inventory.notes')} htmlFor="mov-obs">
                <Input
                  id="mov-obs"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  maxLength={500}
                />
              </FormField>
              <Button
                type="submit"
                disabled={
                  guardando ||
                  !destinoId ||
                  !codigoDestino.trim() ||
                  Number(cantidad) <= 0 ||
                  (origen != null && Number(cantidad) - origen.cantidad > 0.001)
                }
              >
                {guardando ? t('common.saving') : t('movimientos.submit')}
              </Button>
            </form>
          ) : null}
        </div>
      )}

      {!cargando ? (
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t('movimientos.historyTitle')}
          </h2>
          {historial.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('movimientos.historyEmpty')}</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {historial.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {row.codigo} · {t(`movimientos.tipo.${row.tipo}`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {row.inventoryNombre}
                      {row.loteCodigo ? ` · ${row.loteCodigo}` : ''}
                      {' · '}
                      {row.origenCodigo ?? '—'} → {row.destinoCodigo ?? '—'}
                      {' · '}
                      {row.cantidad}
                    </p>
                  </div>
                  <time
                    className="text-xs tabular-nums text-muted-foreground"
                    dateTime={row.createdAt}
                  >
                    {row.createdAt.slice(0, 16).replace('T', ' ')}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
