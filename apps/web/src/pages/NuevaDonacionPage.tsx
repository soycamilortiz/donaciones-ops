import type { Acopio, InterpretacionDonacion } from '@soschoco/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import { leerAcopioRecordado, recordarAcopio } from '@/features/donaciones/acopio-recordado';
import {
  confirmarDonacion,
  interpretarImagen,
  subirFoto,
} from '@/features/donaciones/donaciones-service';
import { leerEanDeFoto } from '@/features/donaciones/leer-ean';
import { readStoredToken } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';
import { cn } from '@/lib/utils';

type Fase = 'inicio' | 'subiendo' | 'reconociendo' | 'listo' | 'error';

const fieldLabel = 'text-xs font-bold uppercase tracking-wider text-muted-foreground';

/**
 * Barras de progreso subir → reconocer → confirmar. Es presentacional: no lleva
 * estado propio, sólo lee la `fase` real de la máquina de estados.
 */
function Stepper({ activo }: { activo: number }) {
  return (
    <div aria-hidden className="flex gap-2">
      {[0, 1, 2].map((paso) => (
        <span
          key={paso}
          className={cn(
            'h-1 flex-1 rounded-pill',
            paso < activo ? 'bg-success' : paso === activo ? 'bg-accent' : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}

export default function NuevaDonacionPage() {
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();

  const [fase, setFase] = useState<Fase>('inicio');
  const [error, setError] = useState<string | null>(null);
  const [imagenId, setImagenId] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [acopios, setAcopios] = useState<Acopio[]>([]);
  const [acopioId, setAcopioId] = useState<string>(() => leerAcopioRecordado(orgId));
  const [lectura, setLectura] = useState<InterpretacionDonacion | null>(null);
  const [eanManual, setEanManual] = useState('');
  const entradaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`)
      .then(setAcopios)
      .catch(() => setAcopios([]));
  }, [request, orgId]);

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
      setFase('subiendo');

      try {
        const creada = await subirFoto(request, orgId, archivo, {
          token: readStoredToken(),
          acopioId: acopioId || undefined,
        });
        setImagenId(creada.id);
        setFase('reconociendo');
        const tipado = eanManual.replace(/\D/g, '');
        const ean =
          (tipado.length >= 8 && tipado.length <= 14 ? tipado : null) ??
          (await leerEanDeFoto(archivo));
        const r = await interpretarImagen(request, orgId, creada.id, {
          ean: ean ?? undefined,
          acopioId: acopioId || undefined,
        });
        setLectura(r);
        setFase('listo');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('newDonation.uploadError'));
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

  if (!can('donaciones:write')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('newDonation.noPermission')}</p>;
  }

  // Paso activo del stepper derivado de la fase real (−1 = sin progreso visible).
  const pasoActivo =
    fase === 'subiendo' ? 0 : fase === 'reconociendo' ? 1 : fase === 'listo' ? 2 : -1;

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('newDonation.title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('newDonation.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.donaciones)}>
          <Icon name="chevron-right" size={16} />
          {t('newDonation.viewDonations')}
        </Button>
      </div>

      <div className="max-w-xl space-y-4">
        {acopios.length > 0 ? (
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{t('newDonation.acopioLabel')}</span>
            <select
              className="min-h-11 w-full cursor-pointer rounded-md border border-border bg-card px-3.5 text-sm font-medium text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={acopioId}
              onChange={(event) => {
                setAcopioId(event.target.value);
                recordarAcopio(orgId, event.target.value);
              }}
            >
              <option value="">{t('common.unspecified')}</option>
              {acopios.map((acopio) => (
                <option key={acopio.id} value={acopio.id}>
                  {acopio.nombre}
                  {acopio.municipio ? ` — ${acopio.municipio}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t('newDonation.eanOptional')}</span>
          <Input
            inputMode="numeric"
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

        {fase === 'subiendo' || fase === 'reconociendo' ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <Spinner className="text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {fase === 'subiendo' ? t('newDonation.uploading') : t('newDonation.recognizing')}
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
            <Button variant="outline" onClick={() => navigate(ROUTES.donaciones)}>
              {t('newDonation.viewDonations')}
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
}: {
  imagenId: string;
  orgId: string;
  acopioId: string;
  lectura: InterpretacionDonacion | null;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
}) {
  const { t } = useTranslation();
  const mejor = lectura?.coincidencias[0];
  const [nombre, setNombre] = useState(lectura?.nombre ?? '');
  const [marca, setMarca] = useState(lectura?.marca ?? '');
  const [cantidad, setCantidad] = useState(String(lectura?.cantidad ?? 1));
  const [inventoryItemId, setInventoryItemId] = useState(
    mejor && mejor.score >= 0.82 ? mejor.id : '',
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState(false);

  // Tono ok/warn del skin html-base, leído del score real del mejor match: el
  // mismo umbral 0.82 que auto-selecciona la coincidencia. No altera la lógica.
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
    setGuardando(true);
    setError(null);
    try {
      await confirmarDonacion(request, orgId, imagenId, {
        nombre: nombre.trim(),
        cantidad: qty,
        acopioId,
        marca: marca.trim() || undefined,
        inventoryItemId: inventoryItemId || undefined,
      });
      setConfirmada(true);
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
              checked={!inventoryItemId}
              onChange={() => setInventoryItemId('')}
            />
            {t('newDonation.mergeNew')}
          </label>
          {lectura.coincidencias.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="merge"
                checked={inventoryItemId === c.id}
                onChange={() => {
                  setInventoryItemId(c.id);
                  setNombre(c.nombre);
                  setMarca(c.marca ?? '');
                }}
              />
              {t('newDonation.mergeExisting', { name: c.nombre, qty: c.cantidad })}
            </label>
          ))}
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t('newDonation.productName')}</span>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t('newDonation.brand')}</span>
        <Input value={marca} onChange={(e) => setMarca(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t('newDonation.quantity')}</span>
        <Input
          type="number"
          min={1}
          step={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <Button onClick={() => void onConfirmar()} disabled={guardando}>
        {guardando ? t('common.saving') : t('newDonation.confirm')}
      </Button>
    </div>
  );
}
