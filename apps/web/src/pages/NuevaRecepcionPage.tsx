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
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
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

  // Active acopios only: the API rejects receiving into one that was taken
  // down, so offering it in the select just produces an error on save. Same for
  // the remembered acopio, which may have been deactivated since the last visit.
  useEffect(() => {
    void request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`)
      .then((filas) => {
        const activos = filas.filter((fila) => fila.isActive !== false);
        setAcopios(activos);
        setAcopioId((actual) => (activos.some((fila) => fila.id === actual) ? actual : ''));
      })
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
        <p className="max-w-2xl text-sm text-muted-foreground">{t('receptions.newSubtitle')}</p>
      </div>

      <div className="max-w-xl space-y-4 rounded-lg border border-border bg-card p-5">
        <FormField label={t('newDonation.acopioLabel')} htmlFor="recepcion-acopio" required>
          <Select
            id="recepcion-acopio"
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
          </Select>
        </FormField>

        <FormField label={t('receptions.columns.type')} htmlFor="recepcion-tipo">
          <Select
            id="recepcion-tipo"
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
          >
            {RECEPCION_TIPOS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(`receptions.tipo.${item.value}`)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('receptions.presentation')} htmlFor="recepcion-presentacion">
          <Select
            id="recepcion-presentacion"
            value={presentacion}
            onChange={(event) => setPresentacion(event.target.value)}
          >
            {RECEPCION_PRESENTACIONES.map((item) => (
              <option key={item.value} value={item.value}>
                {t(`receptions.presentacion.${item.value}`)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('receptions.donor')} htmlFor="recepcion-donante">
          <Input
            id="recepcion-donante"
            value={donanteNombre}
            onChange={(e) => setDonanteNombre(e.target.value)}
          />
        </FormField>
        <FormField label={t('receptions.donorContact')} htmlFor="recepcion-contacto">
          <Input
            id="recepcion-contacto"
            value={donanteContacto}
            onChange={(e) => setDonanteContacto(e.target.value)}
          />
        </FormField>
        <FormField label={t('receptions.plate')} htmlFor="recepcion-placa">
          <Input
            id="recepcion-placa"
            value={vehiculoPlaca}
            onChange={(e) => setVehiculoPlaca(e.target.value)}
          />
        </FormField>
        <FormField label={t('receptions.notes')} htmlFor="recepcion-notas">
          <Input
            id="recepcion-notas"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </FormField>

        <fieldset className="space-y-3 rounded-md border border-border p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('receptions.unitsHint')}
          </legend>
          <FormField label={t('receptions.unitCount')} htmlFor="recepcion-ul-cantidad">
            <Input
              id="recepcion-ul-cantidad"
              type="number"
              min={0}
              max={200}
              value={cantidadUnidades}
              onChange={(e) => setCantidadUnidades(e.target.value)}
            />
          </FormField>
          <FormField label={t('receptions.unitType')} htmlFor="recepcion-ul-tipo">
            <Select
              id="recepcion-ul-tipo"
              value={tipoUnidad}
              onChange={(e) => setTipoUnidad(e.target.value)}
            >
              {UNIDAD_LOGISTICA_TIPOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {t(`receptions.ulTipo.${item.value}`)}
                </option>
              ))}
            </Select>
          </FormField>
        </fieldset>

        {error ? (
          <p role="alert" className="text-sm font-medium text-error">
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
      </div>
    </form>
  );
}
