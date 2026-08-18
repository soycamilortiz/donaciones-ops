import type { InterpretacionDonacion, UnidadLogistica } from '@soschoco/shared';
import { INVENTORY_UNIDADES } from '@soschoco/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { SkeletonList } from '@/components/atoms/Skeleton';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import {
  confirmarDonacion,
  interpretarImagen,
  subirFoto,
} from '@/features/donaciones/donaciones-service';
import { leerEanDeFoto } from '@/features/donaciones/leer-ean';
import { obtenerRecepcion } from '@/features/recepciones/recepciones-service';
import { readStoredToken } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';
import { cn } from '@/lib/utils';

type Fase = 'inicio' | 'optimizando' | 'subiendo' | 'reconociendo' | 'listo' | 'error';

const UL_SUELTA = 'suelta';

const fieldLabel = 'text-xs font-bold uppercase tracking-wider text-muted-foreground';
/**
 * Progress bars upload → recognize → confirm. Presentational only: it reads
 * the real state machine `fase`.
 */
function Stepper({ activo }: { activo: number }) {
  const { t } = useTranslation();
  const total = 3;
  return (
    // Las barras son decoración; el progreso lo lleva el `progressbar`, que sí
    // se anuncia. Antes todo el bloque era `aria-hidden`: quien no ve la
    // pantalla no tenía forma de saber en qué paso iba la captura.
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={Math.max(activo + 1, 1)}
      aria-valuetext={t('newDonation.stepOf', { step: Math.max(activo + 1, 1), total })}
      className="flex gap-2"
    >
      {[0, 1, 2].map((paso) => (
        <span
          key={paso}
          aria-hidden
          className={cn(
            'h-1 flex-1 rounded-pill',
            paso < activo ? 'bg-success' : paso === activo ? 'bg-accent' : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}

function UnidadSelect({
  unidades,
  value,
  onChange,
}: {
  unidades: UnidadLogistica[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="flex flex-col gap-1.5" htmlFor="donacion-ul">
      <span className={fieldLabel}>{t('newDonation.unitLabel')}</span>
      <Select
        id="donacion-ul"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="">{t('newDonation.unitPlaceholder')}</option>
        <option value={UL_SUELTA}>{t('receptions.loose')}</option>
        {unidades.map((ul) => (
          <option key={ul.id} value={ul.id}>
            {ul.codigo} · #{ul.nroEnRecepcion} · {t(`receptions.ulTipo.${ul.tipo}`)}
          </option>
        ))}
      </Select>
      <span className="text-xs text-muted-foreground">{t('newDonation.unitHint')}</span>
    </label>
  );
}

export default function NuevaDonacionPage() {
  const navigate = useNavigate();
  const { id: recepcionId = '' } = useParams();
  const [params] = useSearchParams();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const ulId = params.get('ulId') ?? '';

  const [fase, setFase] = useState<Fase>('inicio');
  const [error, setError] = useState<string | null>(null);
  const [imagenId, setImagenId] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [acopioId, setAcopioId] = useState('');
  const [acopioNombre, setAcopioNombre] = useState('');
  const [lectura, setLectura] = useState<InterpretacionDonacion | null>(null);
  const [eanManual, setEanManual] = useState('');
  const [unidades, setUnidades] = useState<UnidadLogistica[]>([]);
  const [unidadLogisticaId, setUnidadLogisticaId] = useState(ulId);
  const [carga, setCarga] = useState<'pendiente' | 'ok' | 'error'>('pendiente');
  const entradaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!recepcionId) {
      return;
    }
    void obtenerRecepcion(request, orgId, recepcionId)
      .then((row) => {
        setAcopioId(row.acopioId);
        setAcopioNombre(row.acopioNombre ?? '');
        setUnidades(row.unidades);
        setUnidadLogisticaId((actual) => {
          if (actual) {
            return actual;
          }
          return row.unidades.length === 0 ? UL_SUELTA : '';
        });
        setCarga('ok');
      })
      .catch(() => setCarga('error'));
  }, [request, orgId, recepcionId]);

  useEffect(() => {
    return () => {
      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }
    };
  }, [vistaPrevia]);

  const onArchivo = useCallback(
    async (archivo: File | undefined) => {
      if (!archivo) {
        return;
      }
      setError(null);
      setLectura(null);
      setVistaPrevia(URL.createObjectURL(archivo));
      setFase('optimizando');

      try {
        const tipado = eanManual.replace(/\D/g, '');
        const ean =
          (tipado.length >= 8 && tipado.length <= 14 ? tipado : null) ??
          (await leerEanDeFoto(archivo));

        const { comprimirImagen } = await import('@/features/donaciones/comprimir-imagen');
        const comprimida = await comprimirImagen(archivo);
        setFase('subiendo');
        const creada = await subirFoto(request, orgId, comprimida, {
          token: readStoredToken(),
          acopioId: acopioId || undefined,
        });
        setImagenId(creada.id);
        setFase('reconociendo');
        const r = await interpretarImagen(request, orgId, creada.id, {
          ean: ean ?? undefined,
          acopioId: acopioId || undefined,
        });
        setLectura(r);
        setFase('listo');
      } catch (err) {
        const codigo = err instanceof Error ? err.message : '';
        let mensaje: string;
        if (codigo.startsWith('COMPRESS_') || codigo === 'HEIC_CONVERT_FAILED') {
          switch (codigo) {
            case 'COMPRESS_INPUT_TOO_LARGE':
              mensaje = t('newDonation.compressInputTooLarge');
              break;
            case 'COMPRESS_OUTPUT_TOO_LARGE':
              mensaje = t('newDonation.compressOutputTooLarge');
              break;
            case 'COMPRESS_UNSUPPORTED':
              mensaje = t('newDonation.compressUnsupported');
              break;
            case 'HEIC_CONVERT_FAILED':
              mensaje = t('newDonation.heicConvertFailed');
              break;
            default:
              mensaje = t('newDonation.compressError');
          }
        } else {
          mensaje = err instanceof Error ? err.message : t('newDonation.uploadError');
        }
        setError(mensaje);
        setFase('error');
      }
    },
    [request, orgId, acopioId, eanManual, t],
  );

  const reiniciar = () => {
    setFase('inicio');
    setImagenId(null);
    setError(null);
    setVistaPrevia(null);
    setLectura(null);
    setEanManual('');
    if (entradaRef.current) {
      entradaRef.current.value = '';
    }
  };

  if (!recepcionId) {
    return <Navigate to={ROUTES.recepciones} replace />;
  }

  if (!can('donaciones:write')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('newDonation.noPermission')}</p>;
  }

  if (carga === 'pendiente') {
    return (
      <div className="py-8">
        <SkeletonList filas={3} etiqueta={t('common.loading')} />
      </div>
    );
  }

  if (carga === 'error') {
    return (
      <p role="alert" className="py-8 text-sm text-error">
        {t('receptions.notFound')}
      </p>
    );
  }

  const pasoActivo =
    fase === 'optimizando' || fase === 'subiendo'
      ? 0
      : fase === 'reconociendo'
        ? 1
        : fase === 'listo'
          ? 2
          : -1;

  const volverHref = ROUTES.recepcionDetalle(recepcionId);
  const volverLabel = t('newDonation.viewReceptions');

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('newDonation.title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t('newDonation.subtitleRecepcion')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(volverHref)}>
          <Icon name="chevron-right" size={16} />
          {volverLabel}
        </Button>
      </div>

      <div className="max-w-xl space-y-4">
        {acopioNombre ? (
          <p className="flex flex-col gap-1">
            <span className={fieldLabel}>{t('newDonation.acopioLabel')}</span>
            <span className="text-sm font-medium text-foreground">{acopioNombre}</span>
          </p>
        ) : null}

        {unidades.length > 0 ? (
          <UnidadSelect
            unidades={unidades}
            value={unidadLogisticaId}
            onChange={setUnidadLogisticaId}
          />
        ) : null}

        <label className="flex flex-col gap-1.5" htmlFor="donacion-ean">
          <span className={fieldLabel}>{t('newDonation.eanOptional')}</span>
          <Input
            id="donacion-ean"
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            value={eanManual}
            onChange={(e) => setEanManual(e.target.value)}
            placeholder="3017620422003"
            disabled={fase !== 'inicio'}
          />
          <span className="text-xs text-muted-foreground">{t('newDonation.eanOptionalHint')}</span>
        </label>

        <input
          ref={entradaRef}
          type="file"
          accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp"
          capture="environment"
          className="sr-only"
          id="foto-producto"
          aria-label={t('newDonation.cameraLabel')}
          onChange={(event) => void onArchivo(event.target.files?.[0])}
        />

        {vistaPrevia ? (
          <img
            src={vistaPrevia}
            alt={t('newDonation.photoAlt')}
            className="aspect-[4/3] max-h-72 w-full rounded-lg bg-muted object-contain"
          />
        ) : null}

        {pasoActivo >= 0 ? <Stepper activo={pasoActivo} /> : null}

        {fase === 'inicio' ? (
          <button
            type="button"
            onClick={() => entradaRef.current?.click()}
            aria-label={t('newDonation.cameraLabel')}
            className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3.5 rounded-xl border-2 border-dashed border-border bg-card p-7 text-center transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-secondary text-primary">
              <Icon name="plus" size={28} />
            </span>
            <span className="text-lg font-semibold text-foreground">
              {t('newDonation.takePhoto')}
            </span>
          </button>
        ) : null}

        {fase === 'optimizando' || fase === 'subiendo' || fase === 'reconociendo' ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <Spinner className="text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {fase === 'optimizando'
                ? t('newDonation.optimizing')
                : fase === 'subiendo'
                  ? t('newDonation.uploading')
                  : t('newDonation.recognizing')}
            </p>
          </div>
        ) : null}

        {fase === 'listo' && imagenId ? (
          <Resultado
            imagenId={imagenId}
            orgId={orgId}
            acopioId={acopioId}
            lectura={lectura}
            request={request}
            recepcionId={recepcionId}
            unidades={unidades}
            unidadLogisticaId={unidadLogisticaId}
          />
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-error bg-error-soft p-4"
          >
            <Badge variant="error">{t('newDonation.result.failed')}</Badge>
            <p className="text-sm text-foreground">{error}</p>
          </div>
        ) : null}

        {fase === 'listo' || fase === 'error' ? (
          <div className="flex flex-wrap gap-3">
            <Button onClick={reiniciar}>{t('newDonation.registerAnother')}</Button>
            <Button variant="outline" onClick={() => navigate(volverHref)}>
              {volverLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Resultado({
  imagenId,
  orgId,
  acopioId,
  lectura,
  request,
  recepcionId,
  unidades,
  unidadLogisticaId,
}: {
  imagenId: string;
  orgId: string;
  acopioId: string;
  lectura: InterpretacionDonacion | null;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  recepcionId: string;
  unidades: UnidadLogistica[];
  unidadLogisticaId: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const mejor = lectura?.coincidencias[0];
  const [nombre, setNombre] = useState(lectura?.nombre ?? '');
  const [marca, setMarca] = useState(lectura?.marca ?? '');
  const [cantidad, setCantidad] = useState(String(lectura?.cantidad ?? 1));
  const [productoId, setProductoId] = useState(mejor && mejor.score >= 0.82 ? mejor.id : '');
  const [unidad, setUnidad] = useState(mejor?.unidadBase ?? 'UNIDAD');
  const [loteOrigen, setLoteOrigen] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState(false);

  const seleccionado = lectura?.coincidencias.find((c) => c.id === productoId);
  const exigeVence = seleccionado?.requiereVencimiento === true;

  const score = mejor?.score ?? null;
  const alto = score !== null && score >= 0.82;
  const porcentaje = score !== null ? Math.round(score * 100) : null;

  if (confirmada) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-success bg-card p-5">
        <Badge variant="success">{t('newDonation.result.confirmed')}</Badge>
        <p className="text-xl font-bold tracking-tight text-foreground">{nombre}</p>
      </div>
    );
  }

  const onConfirmar = async () => {
    const qty = Number(cantidad);
    if (!nombre.trim() || !Number.isFinite(qty) || qty <= 0) {
      setError(t('newDonation.confirmInvalid'));
      return;
    }
    if (!acopioId) {
      setError(t('newDonation.needAcopio'));
      return;
    }
    if (unidades.length > 0 && !unidadLogisticaId) {
      setError(t('newDonation.needUnit'));
      return;
    }
    if (exigeVence && !vencimiento) {
      setError(t('newDonation.needExpiry'));
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await confirmarDonacion(request, orgId, imagenId, {
        nombre: nombre.trim(),
        cantidad: qty,
        acopioId,
        marca: marca.trim() || undefined,
        recepcionId: recepcionId || undefined,
        unidadLogisticaId:
          unidadLogisticaId && unidadLogisticaId !== UL_SUELTA ? unidadLogisticaId : undefined,
        productoId: productoId || undefined,
        crearProducto: !productoId,
        ean: lectura?.ean ?? undefined,
        unidad,
        loteCodigoOrigen: loteOrigen.trim() || undefined,
        vencimiento: vencimiento || undefined,
      });
      setConfirmada(true);
      if (recepcionId) {
        navigate(ROUTES.recepcionDetalle(recepcionId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newDonation.confirmError'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-card p-5',
        alto ? 'border-success' : 'border-warning',
      )}
    >
      <div className="flex flex-col gap-2">
        <Badge variant={alto ? 'success' : 'warning'}>
          {alto ? t('newDonation.result.recognized') : t('newDonation.result.needsConfirm')}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {t(`newDonation.via.${lectura?.via ?? 'manual'}`)}
          {lectura?.ean ? ` · EAN ${lectura.ean}` : ''}
          {lectura?.fuenteEan ? ` · ${t(`newDonation.eanSource.${lectura.fuenteEan}`)}` : ''}
        </p>
        {recepcionId && unidades.length > 0 ? (
          <p className="text-sm font-medium text-foreground">
            {t('newDonation.unitAssigned', {
              unit:
                unidadLogisticaId === UL_SUELTA
                  ? t('receptions.loose')
                  : (unidades.find((ul) => ul.id === unidadLogisticaId)?.codigo ??
                    t('newDonation.unitPlaceholder')),
            })}
          </p>
        ) : null}
      </div>

      {porcentaje !== null ? (
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 flex-1 rounded-pill bg-muted">
            <span
              className={cn('block h-1.5 rounded-pill', alto ? 'bg-success' : 'bg-warning')}
              style={{ width: `${porcentaje}%` }}
            />
          </span>
          <span
            className={cn('font-mono text-xs font-bold', alto ? 'text-success' : 'text-warning')}
          >
            {porcentaje}%
          </span>
        </div>
      ) : null}

      {lectura?.coincidencias.length ? (
        <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
          <legend className={cn('px-1', fieldLabel)}>{t('newDonation.mergeHint')}</legend>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="merge"
              checked={!productoId}
              onChange={() => setProductoId('')}
            />
            {t('newDonation.mergeNew')}
          </label>
          {lectura.coincidencias.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="merge"
                checked={productoId === c.id}
                onChange={() => {
                  setProductoId(c.id);
                  setNombre(c.nombre);
                  setMarca(c.marca ?? '');
                  if (c.unidadBase) {
                    setUnidad(c.unidadBase);
                  }
                }}
              />
              {t('newDonation.mergeExisting', { name: c.nombre })}
            </label>
          ))}
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1.5" htmlFor="donacion-nombre">
        <span className={fieldLabel}>{t('newDonation.productName')}</span>
        <Input id="donacion-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5" htmlFor="donacion-marca">
        <span className={fieldLabel}>{t('newDonation.brand')}</span>
        <Input id="donacion-marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5" htmlFor="donacion-cantidad">
        <span className={fieldLabel}>{t('newDonation.quantity')}</span>
        <Input
          id="donacion-cantidad"
          type="number"
          min={1}
          step={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5" htmlFor="donacion-unidad">
        <span className={fieldLabel}>{t('newDonation.measureUnit')}</span>
        <Select
          id="donacion-unidad"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
        >
          {INVENTORY_UNIDADES.map((item) => (
            <option key={item.value} value={item.value}>
              {t(`inventoryUnits.${item.value}`)}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1.5" htmlFor="donacion-lote">
        <span className={fieldLabel}>{t('newDonation.lotOrigin')}</span>
        <Input
          id="donacion-lote"
          value={loteOrigen}
          onChange={(e) => setLoteOrigen(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5" htmlFor="donacion-vence">
        <span className={fieldLabel}>{t('newDonation.expiry')}</span>
        <Input
          id="donacion-vence"
          type="date"
          value={vencimiento}
          onChange={(e) => setVencimiento(e.target.value)}
          required={exigeVence}
        />
        <span className="text-xs text-muted-foreground">{t('newDonation.expiryHint')}</span>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <Button
        onClick={() => void onConfirmar()}
        disabled={guardando}
        // Pegado al borde inferior en móvil: el teclado numérico de la cantidad
        // tapaba el botón y había que cerrarlo a mano para poder confirmar.
        className="ds-safe-bottom sticky bottom-0 z-10 w-full shadow-lg md:static md:w-auto md:shadow-none"
      >
        {guardando ? t('common.saving') : t('newDonation.confirm')}
      </Button>
    </div>
  );
}
