import type { Acopio } from '@soschoco/shared';
import {
  RECEPCION_PRESENTACIONES,
  RECEPCION_TIPOS,
  RecepcionPresentacion,
  RecepcionTipo,
  UNIDAD_LOGISTICA_TIPOS,
} from '@soschoco/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useOrg } from '@/components/OrgGate';
import { leerAcopioRecordado, recordarAcopio } from '@/features/donaciones/acopio-recordado';
import { crearRecepcion } from '@/features/recepciones/recepciones-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

export default function NuevaRecepcionPage() {
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const [acopios, setAcopios] = useState<Acopio[]>([]);
  const [acopioId, setAcopioId] = useState(() => leerAcopioRecordado(orgId));
  const [tipo, setTipo] = useState<string>(RecepcionTipo.DonacionIndividual);
  const [presentacion, setPresentacion] = useState<string>(RecepcionPresentacion.Suelta);
  const [donanteNombre, setDonanteNombre] = useState('');
  const [donanteContacto, setDonanteContacto] = useState('');
  const [vehiculoPlaca, setVehiculoPlaca] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cantidadUnidades, setCantidadUnidades] = useState('0');
  const [tipoUnidad, setTipoUnidad] = useState('PALLET');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`)
      .then(setAcopios)
      .catch(() => setAcopios([]));
  }, [request, orgId]);

  if (!can('donaciones:write')) {
    return (
      <p className="py-8 text-sm text-muted-foreground">{t('receptions.noPermissionWrite')}</p>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!acopioId) {
      setError(t('newDonation.needAcopio'));
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const n = Number(cantidadUnidades);
      const creada = await crearRecepcion(request, orgId, {
        acopioId,
        tipo,
        presentacionFisica: presentacion,
        donanteNombre: donanteNombre.trim() || undefined,
        donanteContacto: donanteContacto.trim() || undefined,
        vehiculoPlaca: vehiculoPlaca.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        cantidadUnidades: n > 0 ? n : undefined,
        tipoUnidad: n > 0 ? tipoUnidad : undefined,
      });
      navigate(ROUTES.recepcionDetalle(creada.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('receptions.createError'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="space-y-6 py-2" onSubmit={(event) => void onSubmit(event)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('receptions.newTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('receptions.newSubtitle')}</p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('newDonation.acopioLabel')}</span>
        <select
          className="min-h-11 w-full cursor-pointer rounded border border-border bg-card px-3 py-2 text-sm"
          value={acopioId}
          onChange={(event) => {
            setAcopioId(event.target.value);
            recordarAcopio(orgId, event.target.value);
          }}
          required
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

      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('receptions.columns.type')}</span>
        <select
          className="min-h-11 w-full cursor-pointer rounded border border-border bg-card px-3 py-2 text-sm"
          value={tipo}
          onChange={(event) => setTipo(event.target.value)}
        >
          {RECEPCION_TIPOS.map((item) => (
            <option key={item.value} value={item.value}>
              {t(`receptions.tipo.${item.value}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground">{t('receptions.presentation')}</span>
        <select
          className="min-h-11 w-full cursor-pointer rounded border border-border bg-card px-3 py-2 text-sm"
          value={presentacion}
          onChange={(event) => setPresentacion(event.target.value)}
        >
          {RECEPCION_PRESENTACIONES.map((item) => (
            <option key={item.value} value={item.value}>
              {t(`receptions.presentacion.${item.value}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1" htmlFor="recepcion-donante">
        <span className="text-sm font-medium text-foreground">{t('receptions.donor')}</span>
        <Input
          id="recepcion-donante"
          value={donanteNombre}
          onChange={(e) => setDonanteNombre(e.target.value)}
        />
      </label>
      <label className="block space-y-1" htmlFor="recepcion-contacto">
        <span className="text-sm font-medium text-foreground">{t('receptions.donorContact')}</span>
        <Input
          id="recepcion-contacto"
          value={donanteContacto}
          onChange={(e) => setDonanteContacto(e.target.value)}
        />
      </label>
      <label className="block space-y-1" htmlFor="recepcion-placa">
        <span className="text-sm font-medium text-foreground">{t('receptions.plate')}</span>
        <Input
          id="recepcion-placa"
          value={vehiculoPlaca}
          onChange={(e) => setVehiculoPlaca(e.target.value)}
        />
      </label>
      <label className="block space-y-1" htmlFor="recepcion-notas">
        <span className="text-sm font-medium text-foreground">{t('receptions.notes')}</span>
        <Input
          id="recepcion-notas"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </label>

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="text-sm font-medium text-foreground">{t('receptions.unitsHint')}</legend>
        <label className="block space-y-1" htmlFor="recepcion-ul-cantidad">
          <span className="text-sm font-medium text-foreground">{t('receptions.unitCount')}</span>
          <Input
            id="recepcion-ul-cantidad"
            type="number"
            min={0}
            max={200}
            value={cantidadUnidades}
            onChange={(e) => setCantidadUnidades(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t('receptions.unitType')}</span>
          <select
            className="min-h-11 w-full cursor-pointer rounded border border-border bg-card px-3 py-2 text-sm"
            value={tipoUnidad}
            onChange={(e) => setTipoUnidad(e.target.value)}
          >
            {UNIDAD_LOGISTICA_TIPOS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(`receptions.ulTipo.${item.value}`)}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={guardando}>
          {guardando ? t('common.saving') : t('receptions.open')}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(ROUTES.recepciones)}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
