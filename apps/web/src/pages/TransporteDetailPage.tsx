import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import { FormField } from '@/components/molecules/FormField';
import { useToast } from '@/components/molecules/Toast';
import { listarRutas, type Ruta } from '@/features/transporte/rutas-service';
import {
  asignarPalletParada,
  autoAsignarPallets,
  crearParadasViaje,
  getViaje,
  listarCargaPallets,
  registrarEventoViaje,
  registrarLlegadaParada,
  registrarSalidaParada,
  type CargaPallet,
  type ViajeDetalle,
} from '@/features/transporte/transporte-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const ESTADOS_PLANIFICAR = new Set([
  'PLANIFICADO',
  'ASIGNADO',
  'CARGANDO',
  'CARGADO',
  'LISTO',
]);

export default function TransporteDetailPage() {
  const { viajeId = '' } = useParams();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const { avisar } = useToast();
  const [viaje, setViaje] = useState<ViajeDetalle | null>(null);
  const [carga, setCarga] = useState<CargaPallet[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [rutaId, setRutaId] = useState('');
  const [paradaScan, setParadaScan] = useState<string | null>(null);
  const [codigoPallet, setCodigoPallet] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!viajeId) {
      return;
    }
    try {
      const [viajeData, cargaData, rutasData] = await Promise.all([
        getViaje(request, orgId, viajeId),
        listarCargaPallets(request, orgId, viajeId),
        listarRutas(request, orgId),
      ]);
      setViaje(viajeData);
      setCarga(cargaData);
      setRutas(rutasData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('transporte.loadError'));
    } finally {
      setCargando(false);
    }
  }, [orgId, request, t, viajeId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const aplicarRuta = async () => {
    if (!rutaId) {
      return;
    }
    setGuardando(true);
    try {
      const data = await crearParadasViaje(request, orgId, viajeId, { rutaId });
      setViaje(data);
      await cargar();
      avisar(t('transporte.rutaAplicada'));
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('transporte.saveError'), { tono: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const autoAsignar = async () => {
    setGuardando(true);
    try {
      const res = await autoAsignarPallets(request, orgId, viajeId);
      avisar(t('transporte.autoAsignarOk', { n: res.asignados, rest: res.sinAsignar }));
      await cargar();
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('transporte.saveError'), { tono: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const escanearPallet = async () => {
    if (!paradaScan || !codigoPallet.trim()) {
      return;
    }
    setGuardando(true);
    try {
      const data = await asignarPalletParada(
        request,
        orgId,
        viajeId,
        paradaScan,
        codigoPallet.trim(),
      );
      setViaje(data);
      setCodigoPallet('');
      await cargar();
      avisar(t('transporte.palletAsignado'));
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('transporte.saveError'), { tono: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const marcarLlegada = async () => {
    setGuardando(true);
    try {
      const data = await registrarEventoViaje(request, orgId, viajeId, {
        tipo: 'LLEGADA_DESTINO',
        ubicacionNombre: viaje?.destinoNombre ?? undefined,
      });
      setViaje(data);
      avisar(t('transporte.llegadaOk'));
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('transporte.saveError'), { tono: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const llegadaParada = async (paradaId: string) => {
    setGuardando(true);
    try {
      const data = await registrarLlegadaParada(request, orgId, viajeId, paradaId);
      setViaje(data);
      await cargar();
      avisar(t('transporte.paradaLlegadaOk'));
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('transporte.saveError'), { tono: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const salidaParada = async (paradaId: string) => {
    setGuardando(true);
    try {
      const data = await registrarSalidaParada(request, orgId, viajeId, paradaId);
      setViaje(data);
      await cargar();
      avisar(t('transporte.paradaSalidaOk'));
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('transporte.saveError'), { tono: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('transporte.noPermission')}</p>;
  }

  if (cargando) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> {t('common.loading')}
      </p>
    );
  }

  if (!viaje) {
    return <p className="py-8 text-sm text-error">{error ?? t('transporte.loadError')}</p>;
  }

  const puedePlanificar = can('inventory:write') && ESTADOS_PLANIFICAR.has(viaje.estado);
  const enTransito = viaje.estado === 'EN_TRANSITO' || (viaje.estado as string) === 'LLEGO_DESTINO';
  const sinParadas = viaje.paradas.length === 0;

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <Link className="text-sm text-muted-foreground linkish" to={ROUTES.transporte}>
          ← {t('transporte.back')}
        </Link>
        <h1 className="font-mono text-2xl font-semibold text-foreground">{viaje.codigo}</h1>
        <p className="text-sm text-muted-foreground">
          {viaje.origenNombre ?? '—'} → {viaje.destinoNombre ?? '—'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{t(`transporte.estado.${viaje.estado}`)}</Badge>
        {viaje.palletsSinAsignar > 0 ? (
          <Badge variant="warning">{t('transporte.sinAsignar', { n: viaje.palletsSinAsignar })}</Badge>
        ) : null}
      </div>

      {puedePlanificar && sinParadas ? (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="font-medium">{t('transporte.planificarRuta')}</h2>
          <p className="text-sm text-muted-foreground">{t('transporte.planificarRutaHint')}</p>
          {rutas.length === 0 ? (
            <Link className="text-sm linkish" to={ROUTES.rutas}>
              {t('transporte.crearRutaPlantilla')}
            </Link>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <FormField label={t('transporte.plantillaRuta')} htmlFor="sel-ruta">
                <select
                  id="sel-ruta"
                  className="flex h-11 w-full min-w-[200px] rounded-md border border-border bg-card px-3 text-sm"
                  value={rutaId}
                  onChange={(e) => setRutaId(e.target.value)}
                >
                  <option value="">{t('transporte.elegirRuta')}</option>
                  {rutas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo} — {r.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
              <Button disabled={!rutaId || guardando} onClick={() => void aplicarRuta()}>
                {t('transporte.aplicarRuta')}
              </Button>
            </div>
          )}
        </section>
      ) : null}

      {!sinParadas ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium">{t('transporte.paradasTitle')}</h2>
            {puedePlanificar ? (
              <Button disabled={guardando} variant="secondary" onClick={() => void autoAsignar()}>
                {t('transporte.autoAsignar')}
              </Button>
            ) : null}
          </div>
          <ul className="space-y-3">
            {viaje.paradas.map((p) => (
              <li key={p.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {p.sequence}. {p.nombre}
                    </p>
                    {p.destinoNombre ? (
                      <p className="text-sm text-muted-foreground">{p.destinoNombre}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('transporte.paradaResumen', {
                        pallets: p.palletsCount,
                        kits: p.kitsCount,
                      })}
                    </p>
                  </div>
                  <Badge>{(t as (k: string) => string)(`transporte.paradaEstado.${p.estado}`)}</Badge>
                </div>
                {p.palletCodigos.length > 0 ? (
                  <p className="mt-2 font-mono text-xs">{p.palletCodigos.join(', ')}</p>
                ) : null}
                {enTransito && can('inventory:write') ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.estado !== 'LLEGADA' && p.estado !== 'COMPLETADA' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={guardando}
                        onClick={() => void llegadaParada(p.id)}
                      >
                        {t('transporte.llegadaParada')}
                      </Button>
                    ) : null}
                    {p.estado === 'LLEGADA' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={guardando}
                        onClick={() => void salidaParada(p.id)}
                      >
                        {t('transporte.salidaParada')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {puedePlanificar ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={paradaScan === p.id ? 'secondary' : 'ghost'}
                      onClick={() => setParadaScan(paradaScan === p.id ? null : p.id)}
                    >
                      {t('transporte.asignarAqui')}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {paradaScan && puedePlanificar ? (
        <section className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-4">
          <FormField label={t('transporte.codigoPallet')} htmlFor="scan-pallet">
            <Input
              id="scan-pallet"
              value={codigoPallet}
              onChange={(e) => setCodigoPallet(e.target.value)}
              placeholder="PAL-DSP-…"
            />
          </FormField>
          <Button disabled={guardando || !codigoPallet.trim()} onClick={() => void escanearPallet()}>
            {t('transporte.asignarPallet')}
          </Button>
        </section>
      ) : null}

      {carga.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">{t('transporte.cargaTitle')}</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">{t('transporte.colPallet')}</th>
                  <th className="px-3 py-2">{t('transporte.colDestino')}</th>
                  <th className="px-3 py-2">{t('transporte.colKits')}</th>
                  <th className="px-3 py-2">{t('transporte.colParada')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {carga.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-mono">{row.codigo}</td>
                    <td className="px-3 py-2">{row.destinoNombre}</td>
                    <td className="px-3 py-2">{row.kitsCount}</td>
                    <td className="px-3 py-2">{row.paradaNombre ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {enTransito && can('inventory:write') ? (
        <div className="flex flex-wrap gap-2">
          {viaje.estado === 'EN_TRANSITO' ? (
            <Button disabled={guardando} onClick={() => void marcarLlegada()}>
              {t('transporte.marcarLlegada')}
            </Button>
          ) : null}
          <Link to={ROUTES.entregaDetalle(viaje.id)}>
            <Button variant="secondary">{t('transporte.irEntrega')}</Button>
          </Link>
        </div>
      ) : null}

      {viaje.eventos.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">{t('transporte.eventosTitle')}</h2>
          <ul className="space-y-2">
            {viaje.eventos.map((e) => (
              <li key={e.id} className="rounded-lg border border-border p-3 text-sm">
                <span className="font-medium">
                  {(t as (key: string) => string)(`transporte.evento.${e.tipo}`)}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {new Date(e.fechaHora).toLocaleString()}
                </span>
                {e.ubicacionNombre ? (
                  <p className="text-muted-foreground">{e.ubicacionNombre}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link className="text-sm linkish" to={ROUTES.rutas}>
        {t('transporte.gestionarRutas')}
      </Link>
    </div>
  );
}
