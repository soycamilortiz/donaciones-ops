import type { Acopio, Demanda, Kit } from '@soschoco/shared';
import { DemandaItemTipo, DemandaPrioridad } from '@soschoco/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { FormField } from '@/components/molecules/FormField';
import { useOrg } from '@/components/OrgGate';
import { DataTable, type DataTableColumn } from '@/components/organisms/DataTable';
import { leerAcopioRecordado, recordarAcopio } from '@/features/donaciones/acopio-recordado';
import {
  crearDemanda,
  listarCatalogoProductos,
  listarDemandas,
  listarKits,
} from '@/features/reservas/reservas-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const selectClass =
  'flex h-11 w-full cursor-pointer appearance-none rounded-md border border-border bg-card px-3.5 py-2 text-base md:text-sm text-foreground ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

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

type Fila = Demanda & Record<string, unknown>;

export default function DemandasPage() {
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const writable = can('inventory:write');
  const [filas, setFilas] = useState<Fila[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [productos, setProductos] = useState<Array<{ id: string; nombre: string; sku: string }>>(
    [],
  );
  const [acopios, setAcopios] = useState<Acopio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [acopioId, setAcopioId] = useState(() => leerAcopioRecordado(orgId));
  const [destinoNombre, setDestinoNombre] = useState('');
  const [destinoMunicipio, setDestinoMunicipio] = useState('');
  const [prioridad, setPrioridad] = useState<string>(DemandaPrioridad.Media);
  const [fechaRequerida, setFechaRequerida] = useState('');
  const [poblacionAfectada, setPoblacionAfectada] = useState('');
  const [tipoLinea, setTipoLinea] = useState<'KIT' | 'PRODUCTO'>(DemandaItemTipo.Kit);
  const [kitId, setKitId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');

  const cargar = useCallback(async () => {
    try {
      const [rows, kitRows, catalogo, acopioRows] = await Promise.all([
        listarDemandas(request, orgId),
        listarKits(request, orgId),
        listarCatalogoProductos(request, orgId),
        request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`),
      ]);
      setFilas(rows as Fila[]);
      setKits(kitRows);
      setProductos(catalogo);
      setAcopios(acopioRows.filter((row) => row.isActive !== false));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('demands.loadError'));
    } finally {
      setCargando(false);
    }
  }, [request, orgId, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async (event: FormEvent) => {
    event.preventDefault();
    const qty = Number(cantidad);
    const lineaOk = tipoLinea === DemandaItemTipo.Kit ? Boolean(kitId) : Boolean(productoId);
    if (!writable || !acopioId || !destinoNombre.trim() || !lineaOk || !(qty > 0)) {
      return;
    }
    setGuardando(true);
    try {
      recordarAcopio(orgId, acopioId);
      const creada = await crearDemanda(request, orgId, {
        acopioId,
        destinoNombre: destinoNombre.trim(),
        destinoMunicipio: destinoMunicipio.trim() || undefined,
        prioridad,
        fechaRequerida: fechaRequerida || undefined,
        poblacionAfectada: poblacionAfectada ? Number(poblacionAfectada) : undefined,
        items: [
          tipoLinea === DemandaItemTipo.Kit
            ? { tipo: DemandaItemTipo.Kit, kitId, cantidad: qty }
            : { tipo: DemandaItemTipo.Producto, productoId, cantidad: qty },
        ],
      });
      navigate(ROUTES.demandaDetalle(creada.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('demands.saveError'));
      setGuardando(false);
    }
  };

  const columns: DataTableColumn<Fila>[] = [
    {
      key: 'codigo',
      header: t('demands.columns.code'),
      render: (row) => (
        <button
          type="button"
          className="linkish font-medium"
          onClick={() => navigate(ROUTES.demandaDetalle(row.id))}
        >
          {row.codigo}
        </button>
      ),
    },
    {
      key: 'destinoNombre',
      header: t('demands.columns.destination'),
      render: (row) => row.destinoNombre,
    },
    {
      key: 'prioridad',
      header: t('demands.columns.priority'),
      render: (row) => (
        <Badge variant={PRIORIDAD_VARIANTE[row.prioridad] ?? 'secondary'}>
          {t(`demands.prioridad.${row.prioridad}`)}
        </Badge>
      ),
    },
    {
      key: 'estado',
      header: t('demands.columns.status'),
      render: (row) => (
        <Badge variant={ESTADO_VARIANTE[row.estado] ?? 'secondary'}>
          {t(`demands.estado.${row.estado}`)}
        </Badge>
      ),
    },
    {
      key: 'cobertura',
      header: t('demands.columns.coverage'),
      render: (row) => `${Math.round((row.cobertura ?? 0) * 100)}%`,
    },
  ];

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('demands.noPermission')}</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('demands.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('demands.subtitle')}</p>
        </div>
        {writable ? (
          <Button type="button" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? t('common.cancel') : t('demands.open')}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {formOpen && writable ? (
        <form
          onSubmit={crear}
          className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
        >
          <FormField label={t('demands.fields.acopio')} htmlFor="dem-acopio" required>
            <select
              id="dem-acopio"
              className={selectClass}
              value={acopioId}
              onChange={(event) => setAcopioId(event.target.value)}
              required
            >
              <option value="">{t('demands.fields.acopioPlaceholder')}</option>
              {acopios.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('demands.fields.destination')} htmlFor="dem-dest" required>
            <Input
              id="dem-dest"
              value={destinoNombre}
              onChange={(event) => setDestinoNombre(event.target.value)}
              required
            />
          </FormField>
          <FormField label={t('demands.fields.municipality')} htmlFor="dem-mun">
            <Input
              id="dem-mun"
              value={destinoMunicipio}
              onChange={(event) => setDestinoMunicipio(event.target.value)}
            />
          </FormField>
          <FormField label={t('demands.fields.priority')} htmlFor="dem-prio">
            <select
              id="dem-prio"
              className={selectClass}
              value={prioridad}
              onChange={(event) => setPrioridad(event.target.value)}
            >
              {Object.values(DemandaPrioridad).map((value) => (
                <option key={value} value={value}>
                  {t(`demands.prioridad.${value}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('demands.fields.neededBy')} htmlFor="dem-fecha">
            <Input
              id="dem-fecha"
              type="date"
              value={fechaRequerida}
              onChange={(event) => setFechaRequerida(event.target.value)}
            />
          </FormField>
          <FormField label={t('demands.fields.population')} htmlFor="dem-pob">
            <Input
              id="dem-pob"
              type="number"
              min="0"
              value={poblacionAfectada}
              onChange={(event) => setPoblacionAfectada(event.target.value)}
            />
          </FormField>
          <FormField label={t('demands.fields.lineType')} htmlFor="dem-tipo">
            <select
              id="dem-tipo"
              className={selectClass}
              value={tipoLinea}
              onChange={(event) => setTipoLinea(event.target.value as 'KIT' | 'PRODUCTO')}
            >
              <option value={DemandaItemTipo.Kit}>{t('demands.fields.lineTypeKit')}</option>
              <option value={DemandaItemTipo.Producto}>
                {t('demands.fields.lineTypeProduct')}
              </option>
            </select>
          </FormField>
          {tipoLinea === DemandaItemTipo.Kit ? (
            <FormField label={t('demands.fields.kit')} htmlFor="dem-kit" required>
              <select
                id="dem-kit"
                className={selectClass}
                value={kitId}
                onChange={(event) => setKitId(event.target.value)}
                required
              >
                <option value="">{t('demands.fields.kitPlaceholder')}</option>
                {kits.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.codigo} · {row.nombre}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <FormField label={t('demands.fields.product')} htmlFor="dem-prod" required>
              <select
                id="dem-prod"
                className={selectClass}
                value={productoId}
                onChange={(event) => setProductoId(event.target.value)}
                required
              >
                <option value="">{t('demands.fields.productPlaceholder')}</option>
                {productos.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.nombre}
                    {row.sku ? ` · ${row.sku}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField
            label={
              tipoLinea === DemandaItemTipo.Kit
                ? t('demands.fields.qty')
                : t('demands.fields.qtyProduct')
            }
            htmlFor="dem-qty"
            required
          >
            <Input
              id="dem-qty"
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
              required
            />
          </FormField>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={guardando}>
              {guardando ? t('common.saving') : t('demands.create')}
            </Button>
          </div>
        </form>
      ) : null}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {t('common.loading')}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={filas}
          caption={t('demands.tableCaption')}
          emptyMessage={t('demands.empty')}
        />
      )}
    </div>
  );
}
