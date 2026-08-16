import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const { orgId, can } = useOrg();
  const request = useApi();
  const writable = can('inventory:write');
  const [acopios, setAcopios] = useState<Acopio[]>([]);
  const [acopioId, setAcopioId] = useState<string>(() => localStorage.getItem(ACOPIO_KEY) ?? '');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setItems(
      await request<InventoryItem[]>(`/api/v1/organizations/${orgId}/acopios/${id}/inventory`),
    );
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadAcopios se redefine en cada render; orgId es el disparador real de la recarga.
  useEffect(() => {
    void loadAcopios().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Error al cargar acopios');
    });
  }, [orgId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadItems se redefine en cada render; acopioId es el disparador real de la recarga.
  useEffect(() => {
    if (!acopioId) {
      setItems([]);
      return;
    }
    void loadItems(acopioId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Error al cargar inventario');
    });
  }, [orgId, acopioId]);

  const selected = acopios.find((row) => row.id === acopioId);
  const activeItems = useMemo(() => items.filter((item) => item.isActive !== false), [items]);

  const stats = useMemo(() => {
    const categories = new Set(activeItems.map((item) => item.categoria));
    const qty = activeItems.reduce((sum, item) => sum + Number(item.cantidad), 0);
    const alertas = activeItems.filter(
      (item) =>
        item.estado === 'VENCIDO' || item.estado === 'PROXIMO_A_VENCER' || soon(item.vencimiento),
    ).length;
    return {
      activos: activeItems.length,
      cantidad: qty,
      categorias: categories.size,
      alertas,
      bajas: items.length - activeItems.length,
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

  function selectAcopio(id: string) {
    setAcopioId(id);
    localStorage.setItem(ACOPIO_KEY, id);
    setEditing(null);
    setFormOpen(false);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
  }

  // Cerrar pinchando el fondo es una comodidad de raton; con teclado el gesto
  // equivalente es Escape. Sin esto, quien no usa raton queda atrapado en el
  // modal.
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

    // Al abrir, el foco debe entrar al modal; si no, sigue en el boton que lo
    // abrio y tabular lleva al contenido de detras.
    const dialogo = document.querySelector<HTMLElement>('[role="dialog"]');
    dialogo?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();

    return () => document.removeEventListener('keydown', alPulsar);
  }, [formOpen]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acopioId || !writable) {
      return;
    }
    setError(null);
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
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
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
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado');
    }
  }

  if (acopios.filter((row) => row.isActive !== false).length === 0) {
    return (
      <section className="panel">
        <h1>Inventario</h1>
        <p className="lede">El inventario vive en cada centro de acopio. Primero creá un acopio.</p>
        <Link className="button" to="/app/acopios">
          Ir a acopios
        </Link>
      </section>
    );
  }

  return (
    <section className="panel inventory-dash">
      <header className="dash-head">
        <div>
          <p className="eyebrow">Bodega</p>
          <h1>Inventario</h1>
          <p className="muted">
            Existencias del centro seleccionado. Los productos se dan de baja; no se borran.
          </p>
        </div>
        {writable ? (
          <button className="button" type="button" onClick={openCreate}>
            Nuevo producto
          </button>
        ) : null}
      </header>

      <div className="acopio-picker" role="listbox" aria-label="Centro de acopio">
        {acopios
          .filter((row) => row.isActive !== false)
          .map((row) => (
            <button
              key={row.id}
              type="button"
              role="option"
              aria-selected={row.id === acopioId}
              className={row.id === acopioId ? 'acopio-chip is-selected' : 'acopio-chip'}
              onClick={() => selectAcopio(row.id)}
            >
              <strong>{row.nombre}</strong>
              <span>
                {labelOf(ACOPIO_FLUJOS, row.flujo)}
                {row.municipio ? ` · ${row.municipio}` : ''}
              </span>
            </button>
          ))}
      </div>
      {selected?.direccion ? <p className="muted acopio-meta">{selected.direccion}</p> : null}

      <div className="stat-grid">
        <article className="stat-card">
          <span>Productos activos</span>
          <strong>{stats.activos}</strong>
        </article>
        <article className="stat-card">
          <span>Cantidad en stock</span>
          <strong>{stats.cantidad.toLocaleString('es-CO')}</strong>
        </article>
        <article className="stat-card">
          <span>Categorías</span>
          <strong>{stats.categorias}</strong>
        </article>
        <article className="stat-card">
          <span>Alertas de vencimiento</span>
          <strong>{stats.alertas}</strong>
        </article>
        <article className="stat-card">
          <span>Dados de baja</span>
          <strong>{stats.bajas}</strong>
        </article>
      </div>

      <div className="dash-toolbar">
        <label className="field">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, marca, SKU…"
          />
        </label>
        <label className="field">
          Categoría
          <select value={categoria} onChange={(event) => setCategoria(event.target.value)}>
            <option value="">Todas</option>
            {INVENTORY_CATEGORIAS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Ver dados de baja
        </label>
      </div>

      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}

      <div className="table-wrap dash-table">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Cantidad</th>
              <th>Vence</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No hay productos con esos filtros.
                  {writable ? ' Usá Nuevo producto para cargar existencias.' : ''}
                </td>
              </tr>
            ) : (
              visible.map((item) => (
                <tr key={item.id} className={item.isActive === false ? 'is-inactive' : undefined}>
                  <td>
                    <strong>{item.nombre}</strong>
                    <div className="muted">
                      {[item.marca, item.presentacion, item.talla, item.sku]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    {item.isActive === false ? <span className="badge-baja">Baja</span> : null}
                  </td>
                  <td>{labelOf(INVENTORY_CATEGORIAS, item.categoria)}</td>
                  <td>
                    {item.cantidad} {labelOf(INVENTORY_UNIDADES, item.unidad).toLowerCase()}
                  </td>
                  <td>{dateInput(item.vencimiento) || '—'}</td>
                  <td>{labelOf(INVENTORY_ESTADOS, item.estado)}</td>
                  <td>
                    {writable ? (
                      <div className="row-actions">
                        <button type="button" className="linkish" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        {item.isActive === false ? (
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => void setActive(item, true)}
                          >
                            Reactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => void setActive(item, false)}
                          >
                            Dar de baja
                          </button>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen && writable ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: el fondo es decorativo y cerrar al pincharlo es una comodidad de raton; el camino de teclado es Escape, manejado arriba.
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            // Solo si el clic cayo en el fondo, no en el dialogo.
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-form-title"
          >
            <form
              className="form form-wide"
              key={editing?.id ?? 'new'}
              onSubmit={(event) => void onSave(event)}
            >
              <h2 id="inventory-form-title">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
              <p className="muted">
                {editing
                  ? 'Actualizá ficha y cantidades. El registro se conserva.'
                  : 'Cargá un ítem al centro de acopio seleccionado.'}
              </p>
              <div className="form-grid">
                <label className="field">
                  Producto / ayuda
                  <input
                    name="nombre"
                    required
                    minLength={2}
                    defaultValue={editing?.nombre ?? ''}
                  />
                </label>
                <label className="field">
                  Categoría
                  <select
                    name="categoria"
                    defaultValue={editing?.categoria ?? 'ALIMENTOS_NO_PERECEDEROS'}
                  >
                    {INVENTORY_CATEGORIAS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Detalle de categoría
                  <input name="categoriaDetalle" defaultValue={editing?.categoriaDetalle ?? ''} />
                </label>
                <label className="field">
                  SKU / código
                  <input name="sku" defaultValue={editing?.sku ?? ''} />
                </label>
                <label className="field">
                  Marca
                  <input name="marca" defaultValue={editing?.marca ?? ''} />
                </label>
                <label className="field">
                  Presentación
                  <input
                    name="presentacion"
                    placeholder="500 g, 900 ml…"
                    defaultValue={editing?.presentacion ?? ''}
                  />
                </label>
                <label className="field">
                  Talla
                  <input name="talla" defaultValue={editing?.talla ?? ''} />
                </label>
                <label className="field">
                  Destinatario
                  <select name="destinatario" defaultValue={editing?.destinatario ?? 'NO_APLICA'}>
                    {INVENTORY_DESTINATARIOS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Cantidad
                  <input
                    name="cantidad"
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    required
                    defaultValue={editing?.cantidad ?? ''}
                  />
                </label>
                <label className="field">
                  Unidad
                  <select name="unidad" defaultValue={editing?.unidad ?? 'UNIDAD'}>
                    {INVENTORY_UNIDADES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Detalle de unidad
                  <input name="unidadDetalle" defaultValue={editing?.unidadDetalle ?? ''} />
                </label>
                <label className="field">
                  Vencimiento
                  <input
                    name="vencimiento"
                    type="date"
                    defaultValue={dateInput(editing?.vencimiento)}
                  />
                </label>
                <label className="field">
                  Estado
                  <select name="estado" defaultValue={editing?.estado ?? 'BUEN_ESTADO'}>
                    {INVENTORY_ESTADOS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Lote
                  <input name="loteCodigo" defaultValue={editing?.loteCodigo ?? ''} />
                </label>
                <label className="field">
                  Ubicación en bodega
                  <input
                    name="ubicacionInterna"
                    placeholder="Estante, pasillo…"
                    defaultValue={editing?.ubicacionInterna ?? ''}
                  />
                </label>
                <label className="field">
                  Donante
                  <input name="donanteNombre" defaultValue={editing?.donanteNombre ?? ''} />
                </label>
                <label className="field">
                  Contacto del donante
                  <input name="donanteContacto" defaultValue={editing?.donanteContacto ?? ''} />
                </label>
              </div>
              <label className="field">
                Observaciones
                <textarea
                  name="observaciones"
                  rows={2}
                  defaultValue={editing?.observaciones ?? ''}
                />
              </label>
              <div className="inline-form">
                <button className="button" type="submit">
                  {editing ? 'Guardar cambios' : 'Crear producto'}
                </button>
                <button type="button" className="linkish" onClick={closeForm}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
