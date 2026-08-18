import type { Recepcion, RecepcionItem } from '@soschoco/shared';
import { INVENTORY_UNIDADES, UNIDAD_LOGISTICA_TIPOS } from '@soschoco/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { SkeletonList } from '@/components/atoms/Skeleton';
import { useOrg } from '@/components/OrgGate';
import {
  agregarItemManual,
  generarUnidades,
  inspeccionarItem,
  obtenerRecepcion,
  validarRecepcion,
} from '@/features/recepciones/recepciones-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

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
  const [manualUnidad, setManualUnidad] = useState('UNIDAD');
  const [guardando, setGuardando] = useState(false);

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
      <div className="py-8">
        <SkeletonList filas={4} etiqueta={t('common.loading')} />
      </div>
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
                value={ulCantidad}
                onChange={(e) => setUlCantidad(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('receptions.unitType')}</span>
              <Select className="w-auto" value={ulTipo} onChange={(e) => setUlTipo(e.target.value)}>
                {UNIDAD_LOGISTICA_TIPOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(`receptions.ulTipo.${item.value}`)}
                  </option>
                ))}
              </Select>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 pr-3">
                    {t('receptions.columns.product')}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t('receptions.columns.ul')}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t('receptions.columns.received')}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t('receptions.columns.measure')}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t('receptions.columns.approved')}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t('receptions.columns.quarantine')}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t('receptions.columns.rejected')}
                  </th>
                  <th scope="col" className="py-2">
                    {t('receptions.columns.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
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
                value={manualCantidad}
                onChange={(e) => setManualCantidad(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('receptions.measureUnit')}</span>
              <select
                className="min-h-11 w-full cursor-pointer rounded border border-border bg-card px-3 py-2 text-sm"
                value={manualUnidad}
                onChange={(e) => setManualUnidad(e.target.value)}
              >
                {INVENTORY_UNIDADES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(`inventoryUnits.${item.value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">{t('receptions.columns.ul')}</span>
              <Select value={manualUl} onChange={(e) => setManualUl(e.target.value)}>
                <option value="">{t('receptions.loose')}</option>
                {recepcion.unidades.map((ul) => (
                  <option key={ul.id} value={ul.id}>
                    {ul.codigo}
                  </option>
                ))}
              </Select>
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
                  unidad: manualUnidad,
                });
                setManualNombre('');
                setManualMarca('');
                setManualCantidad('1');
                setManualLote('');
                setManualVence('');
                setManualUnidad('UNIDAD');
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
          {recepcion.items.some((item) => item.alertaValidacion === 'FALTA_VENCIMIENTO') ? (
            <p role="status" className="text-sm text-warning">
              {t('receptions.validateWarning')}
            </p>
          ) : null}
          <Button
            disabled={guardando || recepcion.items.length === 0}
            onClick={() => void run(() => validarRecepcion(request, orgId, recepcion.id))}
          >
            {t('receptions.validate')}
          </Button>
        </div>
      ) : null}

      {recepcion.estado === 'VALIDADA' ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('receptions.validatedHint')}</p>
          <p className="text-sm text-muted-foreground">{t('receptions.validatedPutawayHint')}</p>
          {recepcion.items.some((item) => item.cantidadCuarentena > 0) ? (
            <p className="text-sm text-warning">{t('receptions.quarantineAfter')}</p>
          ) : null}
          <Button variant="outline" onClick={() => navigate(ROUTES.inventarioUbicar)}>
            {t('receptions.goPutaway')}
          </Button>
        </div>
      ) : null}
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
  const [aprobada, setAprobada] = useState(String(item.cantidadAprobada || item.cantidadRecibida));
  const [cuarentena, setCuarentena] = useState(String(item.cantidadCuarentena));
  const [rechazada, setRechazada] = useState(String(item.cantidadRechazada));

  return (
    <tr className="border-b border-border align-top">
      <td className="py-2 pr-3">
        <div className="font-medium">{item.producto?.nombre ?? t('receptions.pendingId')}</div>
        <div className="text-xs text-muted-foreground">
          {item.producto?.sku}
          {item.lote?.codigo ? ` · ${item.lote.codigo}` : ''}
          {item.lote?.codigoOrigen ? ` · ${item.lote.codigoOrigen}` : ''}
          {item.lote?.vencimiento ? ` · ${item.lote.vencimiento.slice(0, 10)}` : ''}
        </div>
        {item.alertaValidacion === 'FALTA_VENCIMIENTO' ? (
          <p className="mt-1 text-xs text-warning">{t('receptions.expiryMissing')}</p>
        ) : null}
      </td>
      <td className="py-2 pr-3">{item.unidadLogistica?.codigo ?? t('receptions.loose')}</td>
      <td className="py-2 pr-3">{item.cantidadRecibida}</td>
      <td className="py-2 pr-3">{etiquetaUnidad(item.unidad, t)}</td>
      <td className="py-2 pr-3">
        {writable && item.estadoLinea !== 'VALIDADA' ? (
          <Input
            type="number"
            min={0}
            aria-label={t('receptions.columns.approved')}
            value={aprobada}
            onChange={(e) => setAprobada(e.target.value)}
          />
        ) : (
          item.cantidadAprobada
        )}
      </td>
      <td className="py-2 pr-3">
        {writable && item.estadoLinea !== 'VALIDADA' ? (
          <Input
            type="number"
            min={0}
            aria-label={t('receptions.columns.quarantine')}
            value={cuarentena}
            onChange={(e) => setCuarentena(e.target.value)}
          />
        ) : (
          item.cantidadCuarentena
        )}
      </td>
      <td className="py-2 pr-3">
        {writable && item.estadoLinea !== 'VALIDADA' ? (
          <Input
            type="number"
            min={0}
            aria-label={t('receptions.columns.rejected')}
            value={rechazada}
            onChange={(e) => setRechazada(e.target.value)}
          />
        ) : (
          item.cantidadRechazada
        )}
      </td>
      <td className="py-2">
        <div className="space-y-2">
          <Badge variant="outline">{t(`receptions.linea.${item.estadoLinea}`)}</Badge>
          {writable && item.estadoLinea !== 'VALIDADA' ? (
            <Button
              variant="outline"
              disabled={disabled}
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
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function etiquetaUnidad(
  unidad: string,
  t: (key: `inventoryUnits.${(typeof INVENTORY_UNIDADES)[number]['value']}`) => string,
) {
  const medida = INVENTORY_UNIDADES.find((u) => u.value === unidad);
  return medida ? t(`inventoryUnits.${medida.value}`) : unidad;
}
