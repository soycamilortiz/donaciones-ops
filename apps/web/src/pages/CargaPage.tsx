import type { Despacho, DespachoChecklist } from '@soschoco/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { FormField } from '@/components/molecules/FormField';
import { useOrg } from '@/components/OrgGate';
import {
  actualizarChecklistDespacho,
  cargarPalletDespacho,
  confirmarSalidaDespacho,
  crearDespacho,
  crearViajeDespacho,
  getDespacho,
  listarDespachos,
  planificarDespacho,
  verificarCarga,
} from '@/features/despacho/despacho-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

const CHECKLIST_KEYS = [
  'cargaCompleta',
  'palletsIdentificados',
  'pesoVerificado',
  'destinoConfirmado',
  'vehiculoConfirmado',
  'conductorConfirmado',
  'documentacionCompleta',
  'sellosRegistrados',
] as const satisfies ReadonlyArray<keyof DespachoChecklist>;

export default function CargaPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan') ?? undefined;
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const writable = can('inventory:write');
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [activo, setActivo] = useState<Despacho | null>(null);
  const [codigoPallet, setCodigoPallet] = useState('');
  const [vehiculoPlaca, setVehiculoPlaca] = useState('');
  const [vehiculoCapacidadKg, setVehiculoCapacidadKg] = useState('');
  const [transportista, setTransportista] = useState('');
  const [conductorNombre, setConductorNombre] = useState('');
  const [conductorDocumento, setConductorDocumento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const viajeActivo = useMemo(() => {
    if (!activo?.viajes.length) {
      return null;
    }
    return (
      [...activo.viajes]
        .reverse()
        .find((v) => v.estado === 'CARGANDO' || v.estado === 'PLANIFICADO') ?? activo.viajes.at(-1)
    );
  }, [activo]);

  const cargar = useCallback(async () => {
    if (!id) {
      return;
    }
    try {
      const rows = await listarDespachos(request, orgId, id);
      const filtrados = planId ? rows.filter((row) => row.planId === planId) : rows;
      setDespachos(filtrados);
      setActivo(filtrados[0] ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cargo.loadError'));
    } finally {
      setCargando(false);
    }
  }, [id, orgId, planId, request, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const refrescarDespacho = async (despachoId: string) => {
    const row = await getDespacho(request, orgId, despachoId);
    setActivo(row);
    setDespachos((prev) => prev.map((d) => (d.id === row.id ? row : d)));
  };

  const crear = async () => {
    if (!planId) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const row = await crearDespacho(request, orgId, planId);
      setActivo(row);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cargo.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const planificar = async () => {
    if (!activo) {
      return;
    }
    setOcupado(true);
    try {
      await planificarDespacho(request, orgId, activo.id);
      await refrescarDespacho(activo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cargo.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const asignarViaje = async () => {
    if (!activo) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await crearViajeDespacho(request, orgId, activo.id, {
        vehiculoPlaca: vehiculoPlaca.trim() || undefined,
        vehiculoCapacidadKg: vehiculoCapacidadKg ? Number(vehiculoCapacidadKg) : undefined,
        transportista: transportista.trim() || undefined,
        conductorNombre: conductorNombre.trim() || undefined,
        conductorDocumento: conductorDocumento.trim() || undefined,
      });
      await refrescarDespacho(activo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cargo.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const escanearPallet = async () => {
    if (!activo || !codigoPallet.trim()) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await cargarPalletDespacho(
        request,
        orgId,
        activo.id,
        codigoPallet.trim(),
        viajeActivo?.id,
      );
      setCodigoPallet('');
      await refrescarDespacho(activo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cargo.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const verificar = async (permitirParcial = false) => {
    if (!activo) {
      return;
    }
    setOcupado(true);
    try {
      await verificarCarga(request, orgId, activo.id, permitirParcial);
      await refrescarDespacho(activo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cargo.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const toggleChecklist = async (key: keyof DespachoChecklist) => {
    if (!activo?.checklist) {
      return;
    }
    setOcupado(true);
    try {
      await actualizarChecklistDespacho(request, orgId, activo.id, {
        [key]: !activo.checklist[key],
      });
      await refrescarDespacho(activo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cargo.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const confirmarSalida = async () => {
    if (!activo) {
      return;
    }
    setOcupado(true);
    try {
      await confirmarSalidaDespacho(request, orgId, activo.id, activo.esParcial);
      await refrescarDespacho(activo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cargo.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('cargo.noPermission')}</p>;
  }

  if (cargando) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> {t('common.loading')}
      </p>
    );
  }

  const faltantes =
    activo && activo.palletsEsperados > activo.palletsCargados
      ? activo.palletsEsperados - activo.palletsCargados
      : 0;
  const puedeEscanear =
    activo &&
    (activo.estado === 'LISTO_PARA_CARGA' ||
      activo.estado === 'CARGANDO' ||
      activo.estado === 'PARCIAL');
  const puedeVerificar =
    activo &&
    (activo.estado === 'CARGANDO' || activo.estado === 'LISTO_PARA_CARGA') &&
    activo.palletsCargados > 0;
  const puedeChecklist =
    activo && (activo.estado === 'CARGADO' || activo.estado === 'PARCIAL');

  return (
    <div className="space-y-6 py-2">
      <button
        type="button"
        className="linkish"
        onClick={() => id && navigate(ROUTES.demandaPalletizacion(id))}
      >
        {t('cargo.back')}
      </button>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('cargo.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('cargo.subtitle')}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {!activo && planId && writable ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">{t('cargo.createTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('cargo.createHint')}</p>
          <Button type="button" disabled={ocupado} onClick={() => void crear()}>
            {t('cargo.create')}
          </Button>
        </section>
      ) : null}

      {despachos.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {despachos.map((row) => (
            <Button
              key={row.id}
              type="button"
              variant={activo?.id === row.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActivo(row)}
            >
              {row.codigo}
            </Button>
          ))}
        </div>
      ) : null}

      {activo ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-lg font-semibold">{activo.codigo}</h2>
            <Badge>{t(`cargo.estado.${activo.estado}`)}</Badge>
            {activo.esParcial ? <Badge variant="warning">{t('cargo.partialBadge')}</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('cargo.summaryLine', {
              destino: activo.destinoNombre,
              cargados: activo.palletsCargados,
              esperados: activo.palletsEsperados,
              peso: activo.pesoTotalKg,
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('cargo.kitsLine', {
              cargados: activo.kitsCargados,
              esperados: activo.kitsEsperados,
            })}
          </p>
          {viajeActivo ? (
            <p className="text-sm">
              {t('cargo.viajeLine', {
                codigo: viajeActivo.codigo,
                placa: viajeActivo.vehiculoPlaca ?? '—',
                conductor: viajeActivo.conductorNombre ?? '—',
                cargados: viajeActivo.palletsCargados,
                esperados: viajeActivo.palletsEsperados,
              })}
            </p>
          ) : null}
          {faltantes > 0 ? (
            <p className="text-sm text-warning">{t('cargo.missingPallets', { count: faltantes })}</p>
          ) : null}

          {writable && activo.estado === 'BORRADOR' ? (
            <Button type="button" disabled={ocupado} onClick={() => void planificar()}>
              {t('cargo.planificar')}
            </Button>
          ) : null}

          {writable && activo.estado === 'PLANIFICADO' ? (
            <div className="space-y-3 rounded border border-border p-3">
              <h3 className="font-medium">{t('cargo.viajeTitle')}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t('cargo.vehiculoPlaca')} htmlFor="cargo-placa">
                  <Input
                    id="cargo-placa"
                    value={vehiculoPlaca}
                    onChange={(e) => setVehiculoPlaca(e.target.value)}
                  />
                </FormField>
                <FormField label={t('cargo.vehiculoCapacidad')} htmlFor="cargo-capacidad">
                  <Input
                    id="cargo-capacidad"
                    type="number"
                    min={0}
                    value={vehiculoCapacidadKg}
                    onChange={(e) => setVehiculoCapacidadKg(e.target.value)}
                  />
                </FormField>
                <FormField label={t('cargo.transportista')} htmlFor="cargo-transportista">
                  <Input
                    id="cargo-transportista"
                    value={transportista}
                    onChange={(e) => setTransportista(e.target.value)}
                  />
                </FormField>
                <FormField label={t('cargo.conductorNombre')} htmlFor="cargo-conductor">
                  <Input
                    id="cargo-conductor"
                    value={conductorNombre}
                    onChange={(e) => setConductorNombre(e.target.value)}
                  />
                </FormField>
                <FormField label={t('cargo.conductorDocumento')} htmlFor="cargo-documento">
                  <Input
                    id="cargo-documento"
                    value={conductorDocumento}
                    onChange={(e) => setConductorDocumento(e.target.value)}
                  />
                </FormField>
              </div>
              <Button type="button" disabled={ocupado} onClick={() => void asignarViaje()}>
                {t('cargo.asignarViaje')}
              </Button>
            </div>
          ) : null}

          {writable && puedeEscanear ? (
            <div className="space-y-2">
              <FormField label={t('cargo.codigoPallet')} htmlFor="cargo-pallet">
                <Input
                  id="cargo-pallet"
                  value={codigoPallet}
                  onChange={(e) => setCodigoPallet(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void escanearPallet();
                    }
                  }}
                />
              </FormField>
              <Button
                type="button"
                disabled={ocupado || !codigoPallet.trim()}
                onClick={() => void escanearPallet()}
              >
                {t('cargo.scanPallet')}
              </Button>
            </div>
          ) : null}

          <ul className="divide-y divide-border rounded border border-border">
            {activo.pallets.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-mono">{p.codigo}</span>
                <Badge variant={p.estado === 'CARGADO' || p.estado === 'DESPACHADO' ? 'success' : 'default'}>
                  {t(`palletization.palletEstado.${p.estado}`)}
                </Badge>
              </li>
            ))}
          </ul>

          {writable && puedeVerificar ? (
            <div className="flex flex-wrap gap-2">
              {faltantes === 0 ? (
                <Button type="button" disabled={ocupado} onClick={() => void verificar(false)}>
                  {t('cargo.verifyLoad')}
                </Button>
              ) : (
                <Button type="button" disabled={ocupado} variant="outline" onClick={() => void verificar(true)}>
                  {t('cargo.verifyPartial')}
                </Button>
              )}
            </div>
          ) : null}

          {activo.manifiesto ? (
            <div className="rounded border border-border bg-muted/30 p-3 text-sm">
              <h3 className="font-medium">{t('cargo.manifestTitle')}</h3>
              <p>
                {t('cargo.manifestLine', {
                  origen: activo.manifiesto.origenNombre,
                  destino: activo.manifiesto.destinoNombre,
                  pallets: activo.manifiesto.palletsCount,
                  kits: activo.manifiesto.kitsCount,
                  peso: activo.manifiesto.pesoKg,
                })}
              </p>
            </div>
          ) : null}

          {writable && puedeChecklist && activo.checklist ? (
            <div className="space-y-2 rounded border border-border p-3">
              <h3 className="font-medium">{t('cargo.checklistTitle')}</h3>
              <ul className="space-y-1 text-sm">
                {CHECKLIST_KEYS.map((key) => (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activo.checklist?.[key] ?? false}
                        disabled={ocupado}
                        onChange={() => void toggleChecklist(key)}
                      />
                      {t(`cargo.checklist.${key}`)}
                    </label>
                  </li>
                ))}
              </ul>
              <Button type="button" disabled={ocupado} onClick={() => void confirmarSalida()}>
                {t('cargo.dispatch')}
              </Button>
            </div>
          ) : null}
        </section>
      ) : !planId ? (
        <p className="text-sm text-muted-foreground">{t('cargo.empty')}</p>
      ) : null}
    </div>
  );
}
