import type { Acopio, DonacionImagen } from '@soschoco/shared';
import { DonacionImagenEstado } from '@soschoco/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import { confirmarDonacion, subirFoto } from '@/features/donaciones/donaciones-service';
import { useReconocimiento } from '@/features/donaciones/useReconocimiento';
import { readStoredToken } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

type Fase = 'inicio' | 'subiendo' | 'reconociendo' | 'listo' | 'error';

const CLAVE_ACOPIO = 'soschoco.ultimoAcopio';

/** El acopio se recuerda por organización: cambiar de org no debe arrastrarlo. */
function leerAcopioRecordado(orgId: string): string {
  return localStorage.getItem(`${CLAVE_ACOPIO}.${orgId}`) ?? '';
}

function recordarAcopio(orgId: string, acopioId: string): void {
  if (acopioId) {
    localStorage.setItem(`${CLAVE_ACOPIO}.${orgId}`, acopioId);
  } else {
    localStorage.removeItem(`${CLAVE_ACOPIO}.${orgId}`);
  }
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
  // Quien registra en campo sube muchas fotos seguidas en el mismo acopio;
  // volver a elegirlo cada vez es friccion pura, asi que se recuerda.
  const [acopioId, setAcopioId] = useState<string>(() => leerAcopioRecordado(orgId));
  const entradaRef = useRef<HTMLInputElement>(null);

  const { imagen, enCurso, expirado } = useReconocimiento(request, orgId, imagenId);

  useEffect(() => {
    void request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`)
      .then(setAcopios)
      .catch(() => {
        // Que falle el listado no debe impedir registrar la foto: el acopio se
        // puede completar despues desde la revision.
        setAcopios([]);
      });
  }, [request, orgId]);

  // La vista previa es un object URL; hay que soltarlo o se filtra memoria.
  useEffect(() => {
    return () => {
      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }
    };
  }, [vistaPrevia]);

  useEffect(() => {
    if (imagen && !enCurso) {
      setFase('listo');
    }
  }, [imagen, enCurso]);

  const onArchivo = useCallback(
    async (archivo: File | undefined) => {
      if (!archivo) {
        return;
      }
      setError(null);
      setVistaPrevia(URL.createObjectURL(archivo));
      setFase('subiendo');

      try {
        const creada = await subirFoto(request, orgId, archivo, {
          token: readStoredToken(),
          acopioId: acopioId || undefined,
        });
        setImagenId(creada.id);
        setFase('reconociendo');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('newDonation.uploadError'));
        setFase('error');
      }
    },
    [request, orgId, acopioId, t],
  );

  const reiniciar = () => {
    setFase('inicio');
    setImagenId(null);
    setError(null);
    setVistaPrevia(null);
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
          <span className="text-sm font-medium text-foreground">
            {t('newDonation.acopioLabel')}
          </span>
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

      {/* `capture="environment"` abre la cámara trasera en móvil; en escritorio
          degrada a un selector de archivos, que es lo deseable. */}
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
        // `aspect-[4/3]` reserva el hueco antes de que la imagen cargue. Sin esto
        // el contenido de abajo salta al aparecer la foto, que es justo el
        // instante en que el usuario esta mirando.
        <img
          src={vistaPrevia}
          alt={t('newDonation.photoAlt')}
          className="aspect-[4/3] max-h-72 w-full rounded-lg bg-muted object-contain"
        />
      ) : null}

      {fase === 'inicio' ? (
        <Button onClick={() => entradaRef.current?.click()}>{t('newDonation.takePhoto')}</Button>
      ) : null}

      {fase === 'subiendo' ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {t('newDonation.uploading')}
        </p>
      ) : null}

      {fase === 'reconociendo' ? (
        <div className="space-y-2">
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> {t('newDonation.recognizing')}
          </p>
          <p className="text-xs text-muted-foreground">{t('newDonation.canLeave')}</p>
        </div>
      ) : null}

      {expirado ? (
        <p className="text-sm text-muted-foreground">{t('newDonation.takingLong')}</p>
      ) : null}

      {fase === 'listo' && imagen ? (
        <Resultado imagen={imagen} orgId={orgId} acopioId={acopioId} request={request} />
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
            Ver donaciones
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Resultado({
  imagen,
  orgId,
  acopioId,
  request,
}: {
  imagen: DonacionImagen;
  orgId: string;
  acopioId: string;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
}) {
  const { t } = useTranslation();
  const [nombre, setNombre] = useState(
    imagen.nombreDetectado || imagen.producto?.nombre || imagen.textoOcr?.split('\n')[0] || '',
  );
  const [cantidad, setCantidad] = useState(String(imagen.cantidadDetectada ?? 1));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState(Boolean(imagen.confirmadaEn));

  if (imagen.estado === DonacionImagenEstado.Fallida) {
    return (
      <div className="space-y-1">
        <Badge variant="error">{t('newDonation.result.failed')}</Badge>
        <p className="text-sm text-muted-foreground">{t('newDonation.result.failedHint')}</p>
      </div>
    );
  }

  if (confirmada) {
    return (
      <div className="space-y-1">
        <Badge variant="success">{t('newDonation.result.confirmed')}</Badge>
        <p className="text-lg font-medium text-foreground">{nombre}</p>
        <p className="text-sm text-muted-foreground">
          {t('newDonation.quantity')}: {cantidad}
        </p>
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
      await confirmarDonacion(request, orgId, imagen.id, {
        nombre: nombre.trim(),
        cantidad: qty,
        acopioId,
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
        <p className="text-sm text-muted-foreground">{t('newDonation.result.needsConfirmHint')}</p>
      </div>
      {imagen.textoOcr ? (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{imagen.textoOcr}</p>
      ) : null}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('newDonation.productName')}</span>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('newDonation.quantity')}</span>
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
