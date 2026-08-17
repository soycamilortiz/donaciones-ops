import type { Acopio, InterpretacionDonacion } from '@soschoco/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
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

type Fase = 'inicio' | 'optimizando' | 'subiendo' | 'reconociendo' | 'listo' | 'error';

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

  if (!can('donaciones:write')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('newDonation.noPermission')}</p>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('newDonation.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('newDonation.subtitle')}</p>
      </div>

      {acopios.length > 0 ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t('newDonation.acopioLabel')}</span>
          <select
            className="min-h-11 w-full cursor-pointer rounded border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('newDonation.eanOptional')}</span>
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

      {fase === 'inicio' ? (
        <Button onClick={() => entradaRef.current?.click()}>{t('newDonation.takePhoto')}</Button>
      ) : null}

      {fase === 'optimizando' || fase === 'subiendo' || fase === 'reconociendo' ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />{' '}
          {fase === 'optimizando'
            ? t('newDonation.optimizing')
            : fase === 'subiendo'
              ? t('newDonation.uploading')
              : t('newDonation.recognizing')}
        </p>
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
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
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
  const [inventoryItemId, setInventoryItemId] = useState(mejor && mejor.score >= 0.82 ? mejor.id : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState(false);

  if (confirmada) {
    return (
      <div className="space-y-1">
        <Badge variant="success">{t('newDonation.result.confirmed')}</Badge>
        <p className="text-lg font-medium text-foreground">{nombre}</p>
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
    <div className="space-y-4">
      <div className="space-y-1">
        <Badge variant="warning">{t('newDonation.result.needsConfirm')}</Badge>
        <p className="text-sm text-muted-foreground">
          {t(`newDonation.via.${lectura?.via ?? 'manual'}`)}
          {lectura?.ean ? ` · EAN ${lectura.ean}` : ''}
          {lectura?.fuenteEan ? ` · ${t(`newDonation.eanSource.${lectura.fuenteEan}`)}` : ''}
        </p>
      </div>
      {lectura?.coincidencias.length ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">{t('newDonation.mergeHint')}</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="merge"
              checked={!inventoryItemId}
              onChange={() => setInventoryItemId('')}
            />
            {t('newDonation.mergeNew')}
          </label>
          {lectura.coincidencias.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
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
      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('newDonation.productName')}</span>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('newDonation.brand')}</span>
        <Input value={marca} onChange={(e) => setMarca(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('newDonation.quantity')}</span>
        <Input type="number" min={1} step={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
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
