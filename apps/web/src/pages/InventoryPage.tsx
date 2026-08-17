import { origenAdmiteReubicacion } from '@soschoco/shared';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { Skeleton, SkeletonList } from '@/components/atoms/Skeleton';
import { FormField } from '@/components/molecules/FormField';
import { StatCard } from '@/components/molecules/StatCard';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useOrg } from '../components/OrgGate';
import {
  ACOPIO_FLUJOS,
  type Acopio,
  INVENTORY_CATEGORIAS,
  INVENTORY_DESTINATARIOS,
  INVENTORY_ESTADOS,
  INVENTORY_UNIDADES,
  type InventoryItem,
} from '../lib/api';
import { useApi } from '../lib/useApi';

const ACOPIO_KEY = 'soschoco.inventoryAcopio';

// Skin html-base: control blanco de 44px, radio 12px, foco con anillo verde.
// Se comparte entre los <select> nativos y el <textarea> porque el DS aún no
// expone átomos propios para esos dos; el <input> sí usa el átomo Input.
const fieldControlClass =
  'flex h-11 w-full rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const fieldSelectClass = `${fieldControlClass} cursor-pointer`;
const fieldTextareaClass = `${fieldControlClass} h-auto min-h-[72px] resize-y py-2.5 leading-relaxed`;

// Tabla de 6 columnas en desktop; bajo 721px cada fila se apila como tarjeta
// (UX-002), así que la grilla solo aplica a partir de ese ancho.
const ROW_GRID =
  'min-[721px]:grid-cols-[minmax(200px,2fr)_minmax(120px,1.2fr)_96px_92px_116px_220px]';
const cellLabelClass =
  'text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-[721px]:hidden';
const thClass = 'text-[10px] font-bold uppercase tracking-wider text-muted-foreground';

function labelOf(options: readonly { value: string; label: string }[], value: string) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function dateInput(value?: string | null) {
  if (!value) {
    return '';
  }
  return value.slice(0, 10);
}

function soon(value?: string | null) {
  if (!value) {
    return false;
  }
  const day = new Date(value.slice(0, 10));
  const limit = new Date();
  limit.setDate(limit.getDate() + 30);
  return day.getTime() <= limit.getTime();
}

export default function InventoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orgId, can } = useOrg();
  const request = useApi();
  const writable = can('inventory:write');
  // null = todavía cargando (UX-005). El array vacío ya es "no hay acopios".
  const [acopios, setAcopios] = useState<Acopio[] | null>(null);
  const [acopioId, setAcopioId] = useState<string>(() => localStorage.getItem(ACOPIO_KEY) ?? '');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Error del guardado: vive dentro del modal, junto a Guardar (UX-001), aparte
  // del banner de página que muestra fallos de carga o de baja.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  async function loadAcopios() {
    const rows = await request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`);
    setAcopios(rows);
    const stored = localStorage.getItem(ACOPIO_KEY);
    const next =
      rows.find((row) => row.id === stored && row.isActive !== false)?.id ??
      rows.find((row) => row.isActive !== false)?.id ??
      '';
    setAcopioId(next);
    if (next) {
      localStorage.setItem(ACOPIO_KEY, next);
    }
  }

  async function loadItems(id: string) {
    setItemsLoading(true);
    try {
      setItems(
        await request<InventoryItem[]>(`/api/v1/organizations/${orgId}/acopios/${id}/inventory`),
      );
    } finally {
      setItemsLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadAcopios se redefine en cada render; orgId es el disparador real de la recarga.
  useEffect(() => {
    void loadAcopios().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t('inventory.loadAcopiosError'));
    });
  }, [orgId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadItems se redefine en cada render; acopioId es el disparador real de la recarga.
  useEffect(() => {
    if (!acopioId) {
      setItems([]);
      return;
    }
    void loadItems(acopioId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t('inventory.loadError'));
    });
  }, [orgId, acopioId]);

  const selected = acopios?.find((row) => row.id === acopioId);
  const activeAcopios = acopios?.filter((row) => row.isActive !== false) ?? [];
  const activeItems = useMemo(() => items.filter((item) => item.isActive !== false), [items]);

  const stats = useMemo(() => {
    const categories = new Set(activeItems.map((item) => item.categoria));
    const qty = activeItems.reduce((sum, item) => sum + Number(item.cantidad), 0);
    const alertas = activeItems.filter(
      (item) =>
        item.estado === 'VENCIDO' || item.estado === 'PROXIMO_A_VENCER' || soon(item.vencimiento),
    ).length;
    const pendientes = activeItems.filter((item) => item.pendienteUbicar).length;
    return {
      activos: activeItems.length,
      cantidad: qty,
      categorias: categories.size,
      alertas,
      bajas: items.length - activeItems.length,
      pendientes,
    };
  }, [activeItems, items.length]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!showInactive && item.isActive === false) {
        return false;
      }
      if (categoria && item.categoria !== categoria) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [item.nombre, item.marca, item.sku, item.presentacion, item.talla]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [items, query, categoria, showInactive]);

  const hasFilters = query.trim() !== '' || categoria !== '' || showInactive;

  function clearFilters() {
    setQuery('');
    setCategoria('');
    setShowInactive(false);
  }

  function selectAcopio(id: string) {
    setAcopioId(id);
    localStorage.setItem(ACOPIO_KEY, id);
    setEditing(null);
    setFormOpen(false);
  }

  function openCreate() {
    setSaveError(null);
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setSaveError(null);
    setEditing(item);
    setFormOpen(true);
  }

  function closeForm() {
    setSaveError(null);
    setEditing(null);
    setFormOpen(false);
  }

  // Cerrar pinchando el fondo es una comodidad de raton; con teclado el gesto
  // equivalente es Escape. Sin esto, quien no usa raton queda atrapado en el
  // modal. También se bloquea el scroll del body mientras el modal está abierto
  // (UX-012) para que el fondo no se deslice bajo el diálogo.
  useEffect(() => {
    if (!formOpen) {
      return;
    }
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setEditing(null);
        setFormOpen(false);
        return;
      }
      if (evento.key !== 'Tab') {
        return;
      }

      // Retiene el foco dentro del modal: sin esto se tabula hacia la pagina de
      // detras, que esta visualmente bloqueada, y el foco se pierde de vista.
      const dialogo = document.querySelector<HTMLElement>('[role="dialog"]');
      const dentro = dialogo?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!dentro || dentro.length === 0) {
        return;
      }
      const primero = dentro[0];
      const ultimo = dentro[dentro.length - 1];
      if (!primero || !ultimo) {
        return;
      }
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alPulsar);

    const previoOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Al abrir, el foco debe entrar al modal; si no, sigue en el boton que lo
    // abrio y tabular lleva al contenido de detras.
    const dialogo = document.querySelector<HTMLElement>('[role="dialog"]');
    dialogo?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();

    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = previoOverflow;
    };
  }, [formOpen]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acopioId || !writable) {
      return;
    }
    setSaveError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      nombre: String(data.get('nombre') ?? '').trim(),
      categoria: String(data.get('categoria')),
      categoriaDetalle: String(data.get('categoriaDetalle') ?? '').trim(),
      sku: String(data.get('sku') ?? '').trim(),
      marca: String(data.get('marca') ?? '').trim(),
      presentacion: String(data.get('presentacion') ?? '').trim(),
      talla: String(data.get('talla') ?? '').trim(),
      destinatario: String(data.get('destinatario')),
      cantidad: Number(data.get('cantidad')),
      unidad: String(data.get('unidad')),
      unidadDetalle: String(data.get('unidadDetalle') ?? '').trim(),
      vencimiento: String(data.get('vencimiento') ?? '').trim(),
      estado: String(data.get('estado')),
      loteCodigo: String(data.get('loteCodigo') ?? '').trim(),
      ubicacionInterna: String(data.get('ubicacionInterna') ?? '').trim(),
      donanteNombre: String(data.get('donanteNombre') ?? '').trim(),
      donanteContacto: String(data.get('donanteContacto') ?? '').trim(),
      observaciones: String(data.get('observaciones') ?? '').trim(),
    };
    setSaving(true);
    try {
      if (editing) {
        await request(
          `/api/v1/organizations/${orgId}/acopios/${acopioId}/inventory/${editing.id}`,
          { method: 'PATCH', body: JSON.stringify(payload) },
        );
      } else {
        await request(`/api/v1/organizations/${orgId}/acopios/${acopioId}/inventory`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      closeForm();
      await loadItems(acopioId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('inventory.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function setActive(item: InventoryItem, isActive: boolean) {
    if (!acopioId) {
      return;
    }
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/acopios/${acopioId}/inventory/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      await loadItems(acopioId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.statusUpdateError'));
    }
  }

  const pageHead = (showAction: boolean) => (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
          {t('inventory.warehouse')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
          {t('inventory.title')}
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">{t('inventory.subtitle')}</p>
      </div>
      {showAction && writable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(acopioId ? ROUTES.ubicacionesDe(acopioId) : ROUTES.ubicaciones)}
          >
            {t('inventory.locations')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(ROUTES.inventarioUbicar)}>
            {t('inventory.putaway')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(acopioId ? ROUTES.inventarioMoverDe(acopioId) : ROUTES.inventarioMover)
            }
          >
            {t('inventory.move')}
          </Button>
          <Button type="button" onClick={openCreate}>
            {t('inventory.newProduct')}
            <span className="grid h-[34px] w-[34px] place-items-center rounded-pill bg-primary-deep">
              <Icon name="plus" size={15} className="text-accent" />
            </span>
          </Button>
        </div>
      ) : showAction ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(acopioId ? ROUTES.ubicacionesDe(acopioId) : ROUTES.ubicaciones)}
          >
            {t('inventory.locations')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(ROUTES.inventarioUbicar)}>
            {t('inventory.putaway')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(acopioId ? ROUTES.inventarioMoverDe(acopioId) : ROUTES.inventarioMover)
            }
          >
            {t('inventory.move')}
          </Button>
        </div>
      ) : null}
    </header>
  );

  // UX-005: mientras los acopios cargan se muestran esqueletos, nunca el CTA de
  // "creá un acopio" — ese solo aparece cuando ya sabemos que no hay ninguno.
  if (acopios === null) {
    return (
      <section className="flex flex-col gap-6">
        {pageHead(false)}
        <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
          <span className="sr-only">{t('common.loading')}</span>
          <div className="flex gap-2.5 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <Skeleton key={`chip-${i}`} className="h-16 w-48 shrink-0 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={`stat-${i}`} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <SkeletonList filas={4} etiqueta={t('common.loading')} />
        </div>
      </section>
    );
  }

  if (activeAcopios.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        {pageHead(false)}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-pill bg-secondary text-muted-foreground">
              <Icon name="alert-circle" size={28} />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t('inventory.emptyGateTitle')}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">{t('inventory.emptyGateText')}</p>
            <Button type="button" onClick={() => navigate('/app/acopios')}>
              {t('inventory.goToAcopios')}
              <span className="grid h-[34px] w-[34px] place-items-center rounded-pill bg-primary-deep">
                <Icon name="chevron-right" size={15} className="text-accent" />
              </span>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {pageHead(true)}

      {/* UX-032: bajo 721px la fila de acopios se vuelve una tira horizontal con
          scroll-snap; en desktop hace wrap. */}
      <div
        role="listbox"
        aria-label={t('inventory.acopioPicker')}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 min-[721px]:flex-wrap min-[721px]:overflow-visible min-[721px]:pb-0"
      >
        {activeAcopios.map((row) => {
          const isSelected = row.id === acopioId;
          return (
            <button
              key={row.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => selectAcopio(row.id)}
              className={cn(
                'flex min-h-[62px] w-52 shrink-0 snap-start flex-col justify-center gap-0.5 rounded-lg border px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-[721px]:w-auto min-[721px]:min-w-[190px]',
                isSelected
                  ? 'border-accent bg-accent'
                  : 'border-border bg-card hover:border-muted-foreground/40',
              )}
            >
              <strong
                className={cn(
                  'text-sm font-bold tracking-tight',
                  isSelected ? 'text-primary' : 'text-foreground',
                )}
              >
                {row.nombre}
              </strong>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isSelected ? 'text-primary/80' : 'text-muted-foreground',
                )}
              >
                {labelOf(ACOPIO_FLUJOS, row.flujo)}
                {row.municipio ? ` · ${row.municipio}` : ''}
              </span>
            </button>
          );
        })}
      </div>
      {selected?.direccion ? (
        <p className="-mt-3 text-xs text-muted-foreground">{selected.direccion}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={t('inventory.activeProducts')} value={String(stats.activos)} />
        <StatCard
          label={t('inventory.stockQuantity')}
          value={stats.cantidad.toLocaleString('es-CO')}
        />
        <StatCard label={t('inventory.categories')} value={String(stats.categorias)} />
        <StatCard
          label={t('inventory.expiryAlerts')}
          value={String(stats.alertas)}
          className="border-warning/40 bg-warning-soft"
        />
        <StatCard label={t('inventory.inactive')} value={String(stats.bajas)} />
      </div>

      {stats.pendientes > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3">
          <p className="text-sm text-foreground">
            {t('inventory.pendingPutawayHint', { count: stats.pendientes })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(ROUTES.inventarioUbicar)}
          >
            {t('inventory.putaway')}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3.5 min-[721px]:flex-row min-[721px]:flex-wrap min-[721px]:items-end">
        <FormField label={t('common.search')} htmlFor="inv-q" className="min-[721px]:w-80">
          <div className="relative">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="inv-q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('inventory.searchPlaceholder')}
              className="pl-9"
            />
          </div>
        </FormField>
        <FormField label={t('inventory.category')} htmlFor="inv-cat" className="min-[721px]:w-64">
          <select
            id="inv-cat"
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className={fieldSelectClass}
          >
            <option value="">{t('inventory.allCategories')}</option>
            {INVENTORY_CATEGORIAS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FormField>
        <label className="inline-flex min-h-11 cursor-pointer select-none items-center gap-2.5">
          <span className="relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-pill bg-muted-foreground/40 p-[3px] transition-colors has-[:checked]:bg-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="peer sr-only"
            />
            <span className="h-4 w-4 rounded-pill bg-card shadow-sm transition-transform peer-checked:translate-x-4" />
          </span>
          <span className="text-sm font-semibold text-foreground">
            {t('inventory.showInactive')}
          </span>
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-error-soft px-4 py-3 text-sm font-medium text-error"
        >
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="min-[721px]:overflow-x-auto">
          <div className="min-[721px]:min-w-[940px]">
            <div
              className={cn(
                'hidden gap-3 border-b border-border bg-secondary px-4 min-[721px]:grid min-[721px]:h-11 min-[721px]:items-center',
                ROW_GRID,
              )}
            >
              <span className={thClass}>{t('inventory.product')}</span>
              <span className={thClass}>{t('inventory.category')}</span>
              <span className={thClass}>{t('inventory.quantity')}</span>
              <span className={thClass}>{t('inventory.expires')}</span>
              <span className={thClass}>{t('inventory.status')}</span>
              <span className={cn(thClass, 'text-right')}>{t('inventory.actions')}</span>
            </div>

            {itemsLoading ? (
              <div className="p-4">
                <SkeletonList filas={4} etiqueta={t('common.loading')} />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-pill bg-secondary text-muted-foreground">
                  <Icon name="search" size={28} />
                </span>
                <p className="text-lg font-bold tracking-tight text-foreground">
                  {t('inventory.noResults')}
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {t('inventory.noResultsHint')}
                </p>
                {hasFilters ? (
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    {t('inventory.clearFilters')}
                  </Button>
                ) : null}
              </div>
            ) : (
              visible.map((item) => {
                const inactive = item.isActive === false;
                const sub = [item.marca, item.presentacion, item.talla, item.sku]
                  .filter(Boolean)
                  .join(' · ');
                const estadoClass = cn(
                  'text-sm',
                  item.estado === 'VENCIDO'
                    ? 'font-bold text-error'
                    : item.estado === 'PROXIMO_A_VENCER'
                      ? 'font-bold text-warning'
                      : 'font-medium text-muted-foreground',
                );
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex flex-col gap-2 border-b border-border p-4 transition-colors last:border-b-0 min-[721px]:grid min-[721px]:items-center min-[721px]:gap-3 min-[721px]:px-4 min-[721px]:py-3',
                      ROW_GRID,
                      inactive ? 'bg-muted/50' : 'hover:bg-secondary/60',
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold tracking-tight text-foreground">
                        {item.nombre}
                      </span>
                      {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
                      {inactive ? (
                        <Badge variant="default" className="mt-1 w-fit">
                          {t('inventory.inactiveBadge')}
                        </Badge>
                      ) : null}
                      {item.pendienteUbicar ? (
                        <Badge variant="warning" className="mt-1 w-fit">
                          {t('inventory.pendingBadge')}
                        </Badge>
                      ) : item.balances && item.balances.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {item.balances
                            .filter((b) => b.funcion !== 'RECEPCION')
                            .map((b) => b.codigo)
                            .join(' · ')}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3 min-[721px]:block">
                      <span className={cellLabelClass}>{t('inventory.category')}</span>
                      <span className="text-sm text-muted-foreground">
                        {labelOf(INVENTORY_CATEGORIAS, item.categoria)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 min-[721px]:block">
                      <span className={cellLabelClass}>{t('inventory.quantity')}</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {item.cantidad} {labelOf(INVENTORY_UNIDADES, item.unidad).toLowerCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 min-[721px]:block">
                      <span className={cellLabelClass}>{t('inventory.expires')}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {dateInput(item.vencimiento) || '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 min-[721px]:block">
                      <span className={cellLabelClass}>{t('inventory.status')}</span>
                      <span className={estadoClass}>{labelOf(INVENTORY_ESTADOS, item.estado)}</span>
                    </div>

                    {writable ? (
                      <div className="flex flex-col gap-2 pt-1 min-[721px]:flex-row min-[721px]:items-center min-[721px]:justify-end min-[721px]:gap-1.5 min-[721px]:pt-0">
                        {!inactive &&
                        (item.balances ?? []).some(
                          (b) => origenAdmiteReubicacion(b.funcion) && b.cantidad > 0,
                        ) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full min-[721px]:w-auto"
                            onClick={() => navigate(ROUTES.inventarioMoverDe(acopioId, item.id))}
                          >
                            {t('inventory.move')}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full min-[721px]:w-auto"
                          onClick={() => openEdit(item)}
                        >
                          {t('common.edit')}
                        </Button>
                        {inactive ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-success min-[721px]:w-auto"
                            onClick={() => void setActive(item, true)}
                          >
                            {t('inventory.reactivate')}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-error min-[721px]:w-auto"
                            onClick={() => void setActive(item, false)}
                          >
                            {t('inventory.deactivate')}
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {formOpen && writable ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: el fondo es decorativo y cerrar al pincharlo es una comodidad de raton; el camino de teclado es Escape, manejado arriba.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-primary-deep/40 p-4"
          role="presentation"
          onClick={(event) => {
            // Solo si el clic cayo en el fondo, no en el dialogo.
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-form-title"
            className="flex max-h-[calc(100dvh-32px)] w-full max-w-[812px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            <form
              className="flex min-h-0 flex-1 flex-col"
              key={editing?.id ?? 'new'}
              onSubmit={(event) => void onSave(event)}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div className="flex flex-col gap-1.5">
                  {selected?.nombre ? (
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
                      {selected.nombre}
                    </p>
                  ) : null}
                  <h2
                    id="inventory-form-title"
                    className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                  >
                    {editing ? t('inventory.editProduct') : t('inventory.newProduct')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {editing ? t('inventory.editSubtitle') : t('inventory.newSubtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label={t('common.close')}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-secondary text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
                <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
                  <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t('inventory.groupIdentification')}
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[721px]:grid-cols-3">
                    <FormField
                      label={t('inventory.productName')}
                      htmlFor="f-nombre"
                      required
                      className="sm:col-span-2 min-[721px]:col-span-3"
                    >
                      <Input
                        id="f-nombre"
                        name="nombre"
                        required
                        minLength={2}
                        defaultValue={editing?.nombre ?? ''}
                      />
                    </FormField>
                    <FormField label={t('inventory.brand')} htmlFor="f-marca">
                      <Input id="f-marca" name="marca" defaultValue={editing?.marca ?? ''} />
                    </FormField>
                    <FormField label={t('inventory.category')} htmlFor="f-categoria">
                      <select
                        id="f-categoria"
                        name="categoria"
                        defaultValue={editing?.categoria ?? 'ALIMENTOS_NO_PERECEDEROS'}
                        className={fieldSelectClass}
                      >
                        {INVENTORY_CATEGORIAS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label={t('inventory.categoryDetail')} htmlFor="f-catdet">
                      <Input
                        id="f-catdet"
                        name="categoriaDetalle"
                        placeholder={t('inventory.categoryDetailPlaceholder')}
                        defaultValue={editing?.categoriaDetalle ?? ''}
                      />
                    </FormField>
                    <FormField label={t('inventory.sku')} htmlFor="f-sku">
                      <Input id="f-sku" name="sku" defaultValue={editing?.sku ?? ''} />
                    </FormField>
                  </div>
                </fieldset>

                <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
                  <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t('inventory.groupPresentation')}
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[721px]:grid-cols-3">
                    <FormField label={t('inventory.presentation')} htmlFor="f-pres">
                      <Input
                        id="f-pres"
                        name="presentacion"
                        placeholder={t('inventory.presentationPlaceholder')}
                        defaultValue={editing?.presentacion ?? ''}
                      />
                    </FormField>
                    <FormField label={t('inventory.size')} htmlFor="f-talla">
                      <Input id="f-talla" name="talla" defaultValue={editing?.talla ?? ''} />
                    </FormField>
                    <FormField label={t('inventory.recipient')} htmlFor="f-dest">
                      <select
                        id="f-dest"
                        name="destinatario"
                        defaultValue={editing?.destinatario ?? 'NO_APLICA'}
                        className={fieldSelectClass}
                      >
                        {INVENTORY_DESTINATARIOS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                </fieldset>

                <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
                  <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t('inventory.groupQuantity')}
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[721px]:grid-cols-3">
                    <FormField label={t('inventory.quantity')} htmlFor="f-cant" required>
                      <Input
                        id="f-cant"
                        name="cantidad"
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        required
                        defaultValue={editing?.cantidad ?? ''}
                      />
                    </FormField>
                    <FormField label={t('inventory.unit')} htmlFor="f-unidad">
                      <select
                        id="f-unidad"
                        name="unidad"
                        defaultValue={editing?.unidad ?? 'UNIDAD'}
                        className={fieldSelectClass}
                      >
                        {INVENTORY_UNIDADES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label={t('inventory.unitDetail')} htmlFor="f-unidet">
                      <Input
                        id="f-unidet"
                        name="unidadDetalle"
                        placeholder={t('inventory.unitDetailPlaceholder')}
                        defaultValue={editing?.unidadDetalle ?? ''}
                      />
                    </FormField>
                    <FormField label={t('inventory.expiry')} htmlFor="f-venc">
                      <Input
                        id="f-venc"
                        name="vencimiento"
                        type="date"
                        defaultValue={dateInput(editing?.vencimiento)}
                      />
                    </FormField>
                    <FormField label={t('inventory.status')} htmlFor="f-estado">
                      <select
                        id="f-estado"
                        name="estado"
                        defaultValue={editing?.estado ?? 'BUEN_ESTADO'}
                        className={fieldSelectClass}
                      >
                        {INVENTORY_ESTADOS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label={t('inventory.batch')} htmlFor="f-lote">
                      <Input
                        id="f-lote"
                        name="loteCodigo"
                        defaultValue={editing?.loteCodigo ?? ''}
                      />
                    </FormField>
                  </div>
                </fieldset>

                <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
                  <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t('inventory.groupLocation')}
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[721px]:grid-cols-3">
                    <FormField label={t('inventory.location')} htmlFor="f-ubic">
                      <Input
                        id="f-ubic"
                        name="ubicacionInterna"
                        placeholder={t('inventory.locationPlaceholder')}
                        defaultValue={editing?.ubicacionInterna ?? ''}
                      />
                    </FormField>
                    <FormField label={t('inventory.donor')} htmlFor="f-donante">
                      <Input
                        id="f-donante"
                        name="donanteNombre"
                        defaultValue={editing?.donanteNombre ?? ''}
                      />
                    </FormField>
                    <FormField label={t('inventory.donorContact')} htmlFor="f-contacto">
                      <Input
                        id="f-contacto"
                        name="donanteContacto"
                        defaultValue={editing?.donanteContacto ?? ''}
                      />
                    </FormField>
                  </div>
                </fieldset>

                <FormField label={t('inventory.notes')} htmlFor="f-obs">
                  <textarea
                    id="f-obs"
                    name="observaciones"
                    rows={2}
                    defaultValue={editing?.observaciones ?? ''}
                    className={fieldTextareaClass}
                  />
                </FormField>
              </div>

              <div className="flex flex-col gap-3 border-t border-border bg-secondary/40 px-6 py-4 min-[721px]:flex-row min-[721px]:items-center min-[721px]:justify-end">
                {saveError ? (
                  <p role="alert" className="text-sm font-medium text-error min-[721px]:mr-auto">
                    {saveError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground min-[721px]:mr-auto">
                    {t('inventory.modalHint')}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeForm}
                    disabled={saving}
                    className="flex-1 min-[721px]:flex-none"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    isLoading={saving}
                    disabled={saving}
                    className="flex-1 min-[721px]:flex-none"
                  >
                    {saving
                      ? t('common.saving')
                      : editing
                        ? t('inventory.saveChanges')
                        : t('inventory.createProduct')}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
