import type { Acopio, Ubicacion } from '@soschoco/shared';
import { UBICACION_FUNCIONES, UBICACION_TIPOS } from '@soschoco/shared';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { FormField } from '@/components/molecules/FormField';
import { useOrg } from '@/components/OrgGate';
import {
  actualizarUbicacion,
  crearUbicacion,
  darBajaUbicacion,
  listarUbicaciones,
} from '@/features/ubicaciones/ubicaciones-service';
import { useApi } from '@/lib/useApi';
import { cn } from '@/lib/utils';

const ACOPIO_KEY = 'soschoco.inventoryAcopio';
const selectClass =
  'flex h-11 w-full cursor-pointer appearance-none rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

type Nodo = Ubicacion & { children: Nodo[] };

type Borrador = {
  codigo: string;
  nombre: string;
  tipo: string;
  funcion: string;
  parentId: string;
  capacidad: string;
  temperatura: string;
  alimentos: boolean;
  medicamentos: boolean;
  ropa: boolean;
};

const VACIO: Borrador = {
  codigo: '',
  nombre: '',
  tipo: 'ZONA',
  funcion: 'ALMACENAMIENTO',
  parentId: '',
  capacidad: '',
  temperatura: '',
  alimentos: true,
  medicamentos: true,
  ropa: true,
};

function tipoHijo(tipo: string): string {
  switch (tipo) {
    case 'ZONA':
      return 'PASILLO';
    case 'PASILLO':
      return 'RACK';
    case 'RACK':
      return 'NIVEL';
    case 'NIVEL':
      return 'POSICION';
    default:
      return 'OTRO';
  }
}

function arbolDe(rows: Ubicacion[]): Nodo[] {
  const mapa = new Map(rows.map((row) => [row.id, { ...row, children: [] as Nodo[] }]));
  const raices: Nodo[] = [];
  for (const row of rows) {
    const nodo = mapa.get(row.id);
    if (!nodo) {
      continue;
    }
    const padre = row.parentId ? mapa.get(row.parentId) : undefined;
    if (padre) {
      padre.children.push(nodo);
    } else {
      raices.push(nodo);
    }
  }
  const ordenar = (lista: Nodo[]) => {
    lista.sort((a, b) => {
      if (a.esSistema !== b.esSistema) {
        return a.esSistema ? -1 : 1;
      }
      return a.codigo.localeCompare(b.codigo);
    });
    for (const item of lista) {
      ordenar(item.children);
    }
  };
  ordenar(raices);
  return raices;
}

export default function UbicacionesPage() {
  const { t } = useTranslation();
  const request = useApi();
  const { orgId, can } = useOrg();
  const writable = can('inventory:write');
  const [params, setParams] = useSearchParams();
  const acopioParam = params.get('acopio') ?? '';

  const [acopios, setAcopios] = useState<Acopio[] | null>(null);
  const [fallbackId, setFallbackId] = useState(
    () => acopioParam || localStorage.getItem(ACOPIO_KEY) || '',
  );
  const lista = acopios ?? [];
  const acopioId =
    (acopioParam && lista.some((row) => row.id === acopioParam) ? acopioParam : '') ||
    (fallbackId && lista.some((row) => row.id === fallbackId) ? fallbackId : '') ||
    lista[0]?.id ||
    '';
  const [rows, setRows] = useState<Ubicacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editing, setEditing] = useState<Ubicacion | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [porBaja, setPorBaja] = useState<Ubicacion | null>(null);

  const arbol = useMemo(() => arbolDe(rows), [rows]);

  useEffect(() => {
    void request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`)
      .then((list) => {
        setAcopios(list.filter((row) => row.isActive !== false));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('inventory.loadAcopiosError'));
      });
  }, [orgId, request, t]);

  useEffect(() => {
    if (acopios === null) {
      return;
    }
    if (!acopioId) {
      setRows([]);
      setCargando(false);
      return;
    }
    localStorage.setItem(ACOPIO_KEY, acopioId);
    setCargando(true);
    void listarUbicaciones(request, orgId, acopioId)
      .then(setRows)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('locations.loadError'));
      })
      .finally(() => setCargando(false));
  }, [acopioId, acopios, orgId, request, t]);

  useEffect(() => {
    if (!acopioId || params.get('acopio') === acopioId) {
      return;
    }
    setParams({ acopio: acopioId }, { replace: true });
  }, [acopioId, params, setParams]);

  function resetForm(parcial?: Partial<Borrador>) {
    setEditing(null);
    setBorrador({ ...VACIO, ...parcial });
  }

  function abrirEdicion(row: Ubicacion) {
    setEditing(row);
    setBorrador({
      codigo: row.codigo,
      nombre: row.nombre,
      tipo: row.tipo,
      funcion: row.funcion,
      parentId: row.parentId ?? '',
      capacidad: row.capacidadUnidades != null ? String(row.capacidadUnidades) : '',
      temperatura: row.zonaTemperatura ?? '',
      alimentos: row.permiteAlimentos,
      medicamentos: row.permiteMedicamentos,
      ropa: row.permiteRopa,
    });
  }

  function abrirHijo(padre: Ubicacion) {
    resetForm({
      parentId: padre.id,
      tipo: tipoHijo(padre.tipo),
      funcion: padre.funcion === 'RECEPCION' ? 'ALMACENAMIENTO' : padre.funcion,
      alimentos: padre.permiteAlimentos,
      medicamentos: padre.permiteMedicamentos,
      ropa: padre.permiteRopa,
    });
  }

  async function recargar() {
    setRows(await listarUbicaciones(request, orgId, acopioId));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!acopioId || !writable) {
      return;
    }
    setGuardando(true);
    setError(null);
    const cap = Number(borrador.capacidad);
    const capacidadUnidades = Number.isFinite(cap) && cap > 0 ? cap : undefined;
    try {
      if (editing) {
        await actualizarUbicacion(request, orgId, acopioId, editing.id, {
          nombre: borrador.nombre.trim(),
          tipo: editing.esSistema ? undefined : borrador.tipo,
          funcion: editing.esSistema ? undefined : borrador.funcion,
          parentId: editing.esSistema ? undefined : borrador.parentId || null,
          capacidadUnidades: capacidadUnidades ?? null,
          zonaTemperatura: borrador.temperatura.trim() || null,
          permiteAlimentos: borrador.alimentos,
          permiteMedicamentos: borrador.medicamentos,
          permiteRopa: borrador.ropa,
        });
      } else {
        await crearUbicacion(request, orgId, acopioId, {
          codigo: borrador.codigo.trim(),
          nombre: borrador.nombre.trim(),
          tipo: borrador.tipo,
          funcion: borrador.funcion,
          parentId: borrador.parentId || undefined,
          capacidadUnidades,
          zonaTemperatura: borrador.temperatura.trim() || undefined,
          permiteAlimentos: borrador.alimentos,
          permiteMedicamentos: borrador.medicamentos,
          permiteRopa: borrador.ropa,
        });
      }
      resetForm();
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('locations.saveError'));
    } finally {
      setGuardando(false);
    }
  }

  async function onBaja() {
    if (!porBaja || !acopioId) {
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await darBajaUbicacion(request, orgId, acopioId, porBaja.id);
      if (editing?.id === porBaja.id) {
        resetForm();
      }
      setPorBaja(null);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('locations.saveError'));
    } finally {
      setGuardando(false);
    }
  }

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('locations.noPermission')}</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('locations.title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('locations.subtitle')}</p>
      </div>

      <FormField label={t('inventory.acopioPicker')} htmlFor="ubi-acopio" className="max-w-sm">
        <select
          id="ubi-acopio"
          className={selectClass}
          value={acopioId}
          onChange={(e) => {
            resetForm();
            setFallbackId(e.target.value);
            setParams({ acopio: e.target.value }, { replace: true });
          }}
        >
          {lista.map((row) => (
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t('locations.treeTitle')}
          </h2>
          {cargando ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> {t('common.loading')}
            </p>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
              {t('locations.empty')}
            </p>
          ) : (
            <ul className="space-y-1 rounded-lg border border-border bg-card p-2">
              {arbol.map((nodo) => (
                <Rama
                  key={nodo.id}
                  nodo={nodo}
                  profundidad={0}
                  seleccionado={editing?.id}
                  writable={writable}
                  onEditar={abrirEdicion}
                  onAgregarHijo={abrirHijo}
                  onBaja={setPorBaja}
                />
              ))}
            </ul>
          )}
        </section>

        {writable ? (
          <form className="space-y-4 rounded-lg border border-border bg-card p-5" onSubmit={onSave}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {editing ? t('locations.editTitle') : t('locations.create')}
              </h2>
              {editing ? (
                <Button type="button" variant="outline" size="sm" onClick={() => resetForm()}>
                  {t('locations.newInstead')}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {editing?.esSistema ? t('locations.systemHint') : t('locations.muelleHint')}
            </p>

            <FormField label={t('locations.code')} htmlFor="ubi-codigo" required>
              <Input
                id="ubi-codigo"
                value={borrador.codigo}
                onChange={(e) => setBorrador((a) => ({ ...a, codigo: e.target.value }))}
                required={!editing}
                disabled={Boolean(editing)}
                placeholder="ALI-01"
              />
            </FormField>
            <FormField label={t('locations.name')} htmlFor="ubi-nombre" required>
              <Input
                id="ubi-nombre"
                value={borrador.nombre}
                onChange={(e) => setBorrador((a) => ({ ...a, nombre: e.target.value }))}
                required
                placeholder={t('locations.namePlaceholder')}
              />
            </FormField>
            <FormField label={t('locations.parent')} htmlFor="ubi-padre">
              <select
                id="ubi-padre"
                className={selectClass}
                value={borrador.parentId}
                disabled={editing?.esSistema}
                onChange={(e) => setBorrador((a) => ({ ...a, parentId: e.target.value }))}
              >
                <option value="">{t('locations.parentRoot')}</option>
                {rows
                  .filter((row) => row.id !== editing?.id)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.codigo} · {row.nombre}
                    </option>
                  ))}
              </select>
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t('locations.type')} htmlFor="ubi-tipo">
                <select
                  id="ubi-tipo"
                  className={selectClass}
                  value={borrador.tipo}
                  disabled={editing?.esSistema}
                  onChange={(e) => setBorrador((a) => ({ ...a, tipo: e.target.value }))}
                >
                  {UBICACION_TIPOS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {t(`locations.tipo.${item.value}`)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t('locations.function')} htmlFor="ubi-funcion">
                <select
                  id="ubi-funcion"
                  className={selectClass}
                  value={borrador.funcion}
                  disabled={editing?.esSistema}
                  onChange={(e) => setBorrador((a) => ({ ...a, funcion: e.target.value }))}
                >
                  {UBICACION_FUNCIONES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {t(`locations.funcion.${item.value}`)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label={t('locations.capacity')} htmlFor="ubi-cap">
              <Input
                id="ubi-cap"
                type="number"
                min={0}
                value={borrador.capacidad}
                onChange={(e) => setBorrador((a) => ({ ...a, capacidad: e.target.value }))}
              />
            </FormField>
            <FormField label={t('locations.temperature')} htmlFor="ubi-temp">
              <Input
                id="ubi-temp"
                value={borrador.temperatura}
                onChange={(e) => setBorrador((a) => ({ ...a, temperatura: e.target.value }))}
                placeholder="15–25 °C"
              />
            </FormField>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('locations.allows')}</legend>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={borrador.alimentos}
                  onChange={(e) => setBorrador((a) => ({ ...a, alimentos: e.target.checked }))}
                />
                {t('locations.food')}
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={borrador.medicamentos}
                  onChange={(e) => setBorrador((a) => ({ ...a, medicamentos: e.target.checked }))}
                />
                {t('locations.meds')}
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={borrador.ropa}
                  onChange={(e) => setBorrador((a) => ({ ...a, ropa: e.target.checked }))}
                />
                {t('locations.clothes')}
              </label>
            </fieldset>
            <Button
              type="submit"
              disabled={
                guardando || !borrador.nombre.trim() || (!editing && !borrador.codigo.trim())
              }
            >
              {guardando ? t('common.saving') : editing ? t('common.save') : t('locations.create')}
            </Button>
          </form>
        ) : null}
      </div>

      <ConfirmDialog
        abierto={Boolean(porBaja)}
        titulo={t('locations.deactivateTitle', { code: porBaja?.codigo ?? '' })}
        descripcion={t('locations.deactivateBody')}
        etiquetaConfirmar={t('locations.deactivate')}
        etiquetaCancelar={t('common.cancel')}
        ocupado={guardando}
        onConfirmar={() => void onBaja()}
        onCancelar={() => setPorBaja(null)}
      />
    </div>
  );
}

function Rama({
  nodo,
  profundidad,
  seleccionado,
  writable,
  onEditar,
  onAgregarHijo,
  onBaja,
}: {
  nodo: Nodo;
  profundidad: number;
  seleccionado?: string;
  writable: boolean;
  onEditar: (row: Ubicacion) => void;
  onAgregarHijo: (row: Ubicacion) => void;
  onBaja: (row: Ubicacion) => void;
}) {
  const { t } = useTranslation();
  const activo = seleccionado === nodo.id;
  return (
    <li>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-md px-2 py-2',
          activo ? 'bg-secondary' : 'hover:bg-secondary/60',
        )}
        style={{ paddingLeft: 8 + profundidad * 16 }}
      >
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEditar(nodo)}>
          <span className="block font-medium text-foreground">
            {nodo.codigo}
            {nodo.esSistema ? (
              <Badge variant="outline" className="ml-2 align-middle">
                {t('locations.system')}
              </Badge>
            ) : null}
          </span>
          <span className="block text-xs text-muted-foreground">
            {nodo.nombre} · {t(`locations.tipo.${nodo.tipo}`)} ·{' '}
            {t(`locations.funcion.${nodo.funcion}`)}
            {nodo.capacidadUnidades != null
              ? ` · ${t('locations.occupancy', { used: nodo.ocupacionUnidades, cap: nodo.capacidadUnidades })}`
              : ''}
          </span>
        </button>
        {writable ? (
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onAgregarHijo(nodo)}>
              {t('locations.addChild')}
            </Button>
            {!nodo.esSistema ? (
              <Button type="button" variant="outline" size="sm" onClick={() => onBaja(nodo)}>
                {t('locations.deactivate')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {nodo.children.length > 0 ? (
        <ul>
          {nodo.children.map((hijo) => (
            <Rama
              key={hijo.id}
              nodo={hijo}
              profundidad={profundidad + 1}
              seleccionado={seleccionado}
              writable={writable}
              onEditar={onEditar}
              onAgregarHijo={onAgregarHijo}
              onBaja={onBaja}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
