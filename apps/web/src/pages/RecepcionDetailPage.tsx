import type { Recepcion, RecepcionItem } from '@soschoco/shared';
import { UNIDAD_LOGISTICA_TIPOS } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { useOrg } from '@/components/OrgGate';
import {
  agregarItemManual,
  anularRecepcion,
  generarUnidades,
  inspeccionarItem,
  obtenerRecepcion,
  validarRecepcion,
} from '@/features/recepciones/recepciones-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';
import { cn } from '@/lib/utils';

const ESTADO_VARIANTE: Record<string, BadgeVariant> = {
  BORRADOR: 'secondary',
  EN_RECEPCION: 'info',
  EN_INSPECCION: 'warning',
  PENDIENTE_VALIDACION: 'warning',
  VALIDADA: 'success',
  CERRADA: 'secondary',
  ANULADA: 'error',
};

const ABIERTA = new Set(['BORRADOR', 'EN_RECEPCION', 'EN_INSPECCION', 'PENDIENTE_VALIDACION']);

// Tabla de 7 columnas en desktop; bajo 721px cada línea se apila como tarjeta
// (UX-005) para no forzar scroll horizontal con el móvil en la mano.
const ROW_GRID =
  'min-[721px]:grid-cols-[minmax(160px,1.8fr)_minmax(84px,1fr)_64px_minmax(88px,1fr)_minmax(88px,1fr)_minmax(88px,1fr)_minmax(150px,1.5fr)]';
const cellLabelClass =
  'text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-[721px]:hidden';
const thClass = 'text-[10px] font-bold uppercase tracking-wider text-muted-foreground';

// Compara con épsilon: las cantidades pueden ser kilos (decimales) y la suma
// de floats no es exacta.
const cuadra = (sum: number, target: number) => Math.abs(sum - target) < 1e-9;

// Al validar, el backend desvía lo aprobado a cuarentena cuando falta el lote o
// el vencimiento que el producto exige (UX-003). El DTO ya trae esas reglas, así
// que lo anticipamos en pantalla en vez de dejar que el stock desaparezca.
function willQuarantine(item: RecepcionItem): boolean {
  const producto = item.producto;
  if (!producto) {
    return false;
  }
  const faltaLote = Boolean(producto.requiereLote) && !item.lote?.codigoOrigen;
  const faltaVencimiento = Boolean(producto.requiereVencimiento) && !item.lote?.vencimiento;
  return faltaLote || faltaVencimiento;
}

export default function RecepcionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const [recepcion, setRecepcion] = useState<Recepcion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ulCantidad, setUlCantidad] = useState('1');
  const [ulTipo, setUlTipo] = useState('PALLET');
  const [manualNombre, setManualNombre] = useState('');
  const [manualMarca, setManualMarca] = useState('');
  const [manualCantidad, setManualCantidad] = useState('1');
  const [manualUl, setManualUl] = useState('');
  const [manualLote, setManualLote] = useState('');
  const [manualVence, setManualVence] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmAnular, setConfirmAnular] = useState(false);

  const cargar = useCallback(async () => {
    const row = await obtenerRecepcion(request, orgId, id);
    setRecepcion(row);
  }, [request, orgId, id]);

  useEffect(() => {
    void cargar()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('receptions.loadError'));
      })
      .finally(() => setCargando(false));
  }, [cargar, t]);

  const writable = can('donaciones:write') && recepcion && ABIERTA.has(recepcion.estado);

  const run = async (fn: () => Promise<Recepcion>) => {
    setGuardando(true);
    setError(null);
    try {
      setRecepcion(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('receptions.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> {t('common.loading')}
      </p>
    );
  }

  if (!recepcion) {
    return (
      <p role="alert" className="py-8 text-sm text-error">
        {error ?? t('receptions.notFound')}
      </p>
    );
  }

  const fotoQuery = (ulId?: string) => {
    return `${ROUTES.recepcionFoto(recepcion.id)}${ulId ? `?ulId=${ulId}` : ''}`;
  };

  const cuarentenaCount = recepcion.items.filter(
    (item) => item.estadoLinea !== 'VALIDADA' && willQuarantine(item),
  ).length;

  return (
    <div className="space-y-8 py-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <button type="button" className="linkish" onClick={() => navigate(ROUTES.recepciones)}>
              {t('receptions.title')}
            </button>
          </p>
          <h1 className="text-2xl font-semibold text-foreground">{recepcion.codigo}</h1>
          <p className="text-sm text-muted-foreground">
            {recepcion.acopioNombre} · {t(`receptions.tipo.${recepcion.tipo}`)} ·{' '}
            {t(`receptions.presentacion.${recepcion.presentacionFisica}`)}
          </p>
        </div>
        <Badge variant={ESTADO_VARIANTE[recepcion.estado] ?? 'secondary'}>
          {t(`receptions.estado.${recepcion.estado}`)}
        </Badge>
      </div>

      {recepcion.donanteNombre ? (
        <p className="text-sm text-foreground">
          {t('receptions.donor')}: {recepcion.donanteNombre}
          {recepcion.vehiculoPlaca ? ` · ${recepcion.vehiculoPlaca}` : ''}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">{t('receptions.units')}</h2>
        {recepcion.unidades.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('receptions.noUnits')}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recepcion.unidades.map((ul) => (
              <li
                key={ul.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-foreground">{ul.codigo}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · #{ul.nroEnRecepcion} · {t(`receptions.ulTipo.${ul.tipo}`)}
                  </span>
                </div>
                {writable ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(fotoQuery(ul.id))}
                  >
                    {t('receptions.addPhotoOnUnit')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {writable ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1" htmlFor="ul-cantidad">
              <span className="text-sm font-medium">{t('receptions.unitCount')}</span>
              <Input
                id="ul-cantidad"
                type="number"
                min={1}
                max={200}
                inputMode="numeric"
                value={ulCantidad}
                onChange={(e) => setUlCantidad(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('receptions.unitType')}</span>
              <select
                className="min-h-11 cursor-pointer rounded border border-border bg-card px-3 py-2 text-base md:text-sm"
                value={ulTipo}
                onChange={(e) => setUlTipo(e.target.value)}
              >
                {UNIDAD_LOGISTICA_TIPOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(`receptions.ulTipo.${item.value}`)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              disabled={guardando}
              onClick={() =>
                void run(() =>
                  generarUnidades(request, orgId, recepcion.id, {
                    tipo: ulTipo,
                    cantidad: Number(ulCantidad) || 1,
                  }),
                )
              }
            >
              {t('receptions.generateUnits')}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-foreground">{t('receptions.lines')}</h2>
          {writable ? (
            <Button
              onClick={() => navigate(fotoQuery())}
              variant={recepcion.unidades.length > 0 ? 'outline' : 'primary'}
            >
              {recepcion.unidades.length > 0
                ? t('receptions.addPhotoLoose')
                : t('receptions.addPhoto')}
            </Button>
          ) : null}
        </div>

        {recepcion.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('receptions.noLines')}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="min-[721px]:overflow-x-auto">
              <div className="min-[721px]:min-w-[900px]">
                <div
                  className={cn(
                    'hidden gap-3 border-b border-border bg-secondary px-4 min-[721px]:grid min-[721px]:h-11 min-[721px]:items-center',
                    ROW_GRID,
                  )}
                >
                  <span className={thClass}>{t('receptions.columns.product')}</span>
                  <span className={thClass}>{t('receptions.columns.ul')}</span>
                  <span className={thClass}>{t('receptions.columns.received')}</span>
                  <span className={thClass}>{t('receptions.columns.approved')}</span>
                  <span className={thClass}>{t('receptions.columns.quarantine')}</span>
                  <span className={thClass}>{t('receptions.columns.rejected')}</span>
                  <span className={thClass}>{t('receptions.columns.status')}</span>
                </div>
                {recepcion.items.map((item) => (
                  <Linea
                    key={item.id}
                    item={item}
                    writable={Boolean(writable)}
                    disabled={guardando}
                    onInspect={(body) =>
                      void run(() => inspeccionarItem(request, orgId, recepcion.id, item.id, body))
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {writable ? (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium text-foreground">{t('receptions.addManual')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1" htmlFor="manual-nombre">
              <span className="text-sm font-medium">{t('newDonation.productName')}</span>
              <Input
                id="manual-nombre"
                value={manualNombre}
                onChange={(e) => setManualNombre(e.target.value)}
              />
            </label>
            <label className="space-y-1" htmlFor="manual-marca">
              <span className="text-sm font-medium">{t('newDonation.brand')}</span>
              <Input
                id="manual-marca"
                value={manualMarca}
                onChange={(e) => setManualMarca(e.target.value)}
              />
            </label>
            <label className="space-y-1" htmlFor="manual-cantidad">
              <span className="text-sm font-medium">{t('newDonation.quantity')}</span>
              <Input
                id="manual-cantidad"
                type="number"
                min={0.001}
                inputMode="decimal"
                value={manualCantidad}
                onChange={(e) => setManualCantidad(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('receptions.columns.ul')}</span>
              <select
                className="min-h-11 w-full cursor-pointer rounded border border-border bg-card px-3 py-2 text-base md:text-sm"
                value={manualUl}
                onChange={(e) => setManualUl(e.target.value)}
              >
                <option value="">{t('receptions.loose')}</option>
                {recepcion.unidades.map((ul) => (
                  <option key={ul.id} value={ul.id}>
                    {ul.codigo}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1" htmlFor="manual-lote">
              <span className="text-sm font-medium">{t('receptions.lotOrigin')}</span>
              <Input
                id="manual-lote"
                value={manualLote}
                onChange={(e) => setManualLote(e.target.value)}
              />
            </label>
            <label className="space-y-1" htmlFor="manual-vence">
              <span className="text-sm font-medium">{t('receptions.expiry')}</span>
              <Input
                id="manual-vence"
                type="date"
                value={manualVence}
                onChange={(e) => setManualVence(e.target.value)}
              />
            </label>
          </div>
          <Button
            variant="outline"
            disabled={guardando || !manualNombre.trim()}
            onClick={() =>
              void run(async () => {
                const next = await agregarItemManual(request, orgId, recepcion.id, {
                  nombre: manualNombre.trim(),
                  cantidad: Number(manualCantidad) || 1,
                  marca: manualMarca.trim() || undefined,
                  unidadLogisticaId: manualUl || undefined,
                  loteCodigoOrigen: manualLote.trim() || undefined,
                  vencimiento: manualVence || undefined,
                });
                setManualNombre('');
                setManualMarca('');
                setManualCantidad('1');
                setManualLote('');
                setManualVence('');
                return next;
              })
            }
          >
            {t('receptions.addLine')}
          </Button>
        </section>
      ) : null}

      {writable ? (
        <div className="space-y-3">
          {cuarentenaCount > 0 ? (
            <p
              role="status"
              className="rounded-md bg-warning-soft px-4 py-3 text-sm font-medium text-warning"
            >
              {t('receptions.quarantineSummary', { count: cuarentenaCount })}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={guardando || recepcion.items.length === 0}
              onClick={() => void run(() => validarRecepcion(request, orgId, recepcion.id))}
            >
              {t('receptions.validate')}
            </Button>
            <Button
              variant="destructive"
              disabled={guardando}
              onClick={() => setConfirmAnular(true)}
            >
              {t('receptions.void')}
            </Button>
          </div>
        </div>
      ) : null}

      {recepcion.estado === 'VALIDADA' ? (
        <p className="text-sm text-muted-foreground">{t('receptions.validatedHint')}</p>
      ) : null}

      <ConfirmDialog
        abierto={confirmAnular}
        titulo={t('receptions.voidConfirmTitle')}
        descripcion={t('receptions.voidConfirmDescription')}
        etiquetaConfirmar={t('receptions.voidConfirmAction')}
        etiquetaCancelar={t('common.cancel')}
        ocupado={guardando}
        onCancelar={() => setConfirmAnular(false)}
        onConfirmar={() => {
          setConfirmAnular(false);
          void run(() => anularRecepcion(request, orgId, recepcion.id));
        }}
      />
    </div>
  );
}

function Linea({
  item,
  writable,
  disabled,
  onInspect,
}: {
  item: RecepcionItem;
  writable: boolean;
  disabled: boolean;
  onInspect: (body: {
    cantidadAprobada: number;
    cantidadCuarentena: number;
    cantidadRechazada: number;
  }) => void;
}) {
  const { t } = useTranslation();
  const editable = writable && item.estadoLinea !== 'VALIDADA';
  const [aprobada, setAprobada] = useState(String(item.cantidadAprobada || item.cantidadRecibida));
  const [cuarentena, setCuarentena] = useState(String(item.cantidadCuarentena));
  const [rechazada, setRechazada] = useState(String(item.cantidadRechazada));

  const suma = (Number(aprobada) || 0) + (Number(cuarentena) || 0) + (Number(rechazada) || 0);
  const sumCuadra = cuadra(suma, item.cantidadRecibida);
  const divertira = willQuarantine(item);

  const numberField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    fallback: number,
  ) => (
    <div className="flex items-center justify-between gap-3 min-[721px]:block">
      <span className={cellLabelClass}>{label}</span>
      {editable ? (
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 min-[721px]:w-full"
        />
      ) : (
        <span className="text-sm tabular-nums text-foreground">{fallback}</span>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-border p-4 last:border-b-0 min-[721px]:grid min-[721px]:items-start min-[721px]:gap-3 min-[721px]:px-4 min-[721px]:py-3',
        ROW_GRID,
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">
          {item.producto?.nombre ?? t('receptions.pendingId')}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.producto?.sku}
          {item.lote?.codigo ? ` · ${item.lote.codigo}` : ''}
        </span>
        {divertira ? (
          <div className="mt-1 flex flex-col gap-1">
            <Badge variant="warning" className="w-fit">
              {t('receptions.columns.quarantine')}
            </Badge>
            <span className="text-xs text-warning">{t('receptions.willQuarantineHint')}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 min-[721px]:block">
        <span className={cellLabelClass}>{t('receptions.columns.ul')}</span>
        <span className="text-sm text-muted-foreground">
          {item.unidadLogistica?.codigo ?? t('receptions.loose')}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 min-[721px]:block">
        <span className={cellLabelClass}>{t('receptions.columns.received')}</span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {item.cantidadRecibida}
        </span>
      </div>

      {numberField(t('receptions.columns.approved'), aprobada, setAprobada, item.cantidadAprobada)}
      {numberField(
        t('receptions.columns.quarantine'),
        cuarentena,
        setCuarentena,
        item.cantidadCuarentena,
      )}
      {numberField(
        t('receptions.columns.rejected'),
        rechazada,
        setRechazada,
        item.cantidadRechazada,
      )}

      <div className="flex flex-col gap-2 pt-1 min-[721px]:pt-0">
        <Badge variant="outline" className="w-fit">
          {t(`receptions.linea.${item.estadoLinea}`)}
        </Badge>
        {editable ? (
          <>
            <p
              className={cn(
                'text-xs font-medium tabular-nums',
                sumCuadra ? 'text-success' : 'text-warning',
              )}
            >
              {t('receptions.assignedOf', { sum: suma, received: item.cantidadRecibida })}
            </p>
            {!sumCuadra ? (
              <span className="text-xs text-warning">{t('receptions.sumMismatch')}</span>
            ) : null}
            <Button
              variant="outline"
              disabled={disabled || !sumCuadra}
              className="w-full min-[721px]:w-auto"
              onClick={() =>
                onInspect({
                  cantidadAprobada: Number(aprobada) || 0,
                  cantidadCuarentena: Number(cuarentena) || 0,
                  cantidadRechazada: Number(rechazada) || 0,
                })
              }
            >
              {t('receptions.inspect')}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
