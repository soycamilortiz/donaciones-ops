import type { PalletDespacho } from '@soschoco/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { FormField } from '@/components/molecules/FormField';
import { useOrg } from '@/components/OrgGate';
import {
  escanearKitPallet,
  finalizarPallet,
  getPalletDespacho,
  iniciarPallet,
  marcarPalletListo,
  retirarKitPallet,
} from '@/features/despacho/despacho-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

export default function PalletArmadoPage() {
  const { id, palletId } = useParams<{ id: string; palletId: string }>();
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const writable = can('inventory:write');
  const [pallet, setPallet] = useState<PalletDespacho | null>(null);
  const [codigoKit, setCodigoKit] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [alto, setAlto] = useState('');
  const [ancho, setAncho] = useState('');
  const [largo, setLargo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const activos = useMemo(
    () => pallet?.items.filter((item) => !item.retiradoAt) ?? [],
    [pallet],
  );

  const cargar = useCallback(async () => {
    if (!palletId) {
      return;
    }
    try {
      const row = await getPalletDespacho(request, orgId, palletId);
      setPallet(row);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('palletBuild.loadError'));
    } finally {
      setCargando(false);
    }
  }, [orgId, palletId, request, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const iniciar = async () => {
    if (!palletId) {
      return;
    }
    setOcupado(true);
    try {
      const row = await iniciarPallet(request, orgId, palletId);
      setPallet(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('palletBuild.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const escanear = async () => {
    if (!palletId || !codigoKit.trim()) {
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const row = await escanearKitPallet(request, orgId, palletId, codigoKit.trim());
      setPallet(row);
      setCodigoKit('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('palletBuild.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const finalizar = async () => {
    if (!palletId) {
      return;
    }
    const bruto = Number(pesoBruto);
    const a = Number(alto);
    const w = Number(ancho);
    const l = Number(largo);
    if (!bruto || !a || !w || !l) {
      setError(t('palletBuild.measuresRequired'));
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const row = await finalizarPallet(request, orgId, palletId, {
        pesoBrutoKg: bruto,
        altoM: a,
        anchoM: w,
        largoM: l,
      });
      setPallet(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('palletBuild.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const marcarListo = async () => {
    if (!palletId) {
      return;
    }
    setOcupado(true);
    try {
      const row = await marcarPalletListo(request, orgId, palletId);
      setPallet(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('palletBuild.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  const retirar = async (kitCodigo: string) => {
    if (!palletId) {
      return;
    }
    setOcupado(true);
    try {
      const row = await retirarKitPallet(request, orgId, palletId, kitCodigo, 'DAÑO');
      setPallet(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('palletBuild.saveError'));
    } finally {
      setOcupado(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('palletBuild.noPermission')}</p>;
  }

  if (cargando || !pallet) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> {t('common.loading')}
      </p>
    );
  }

  const puedeEscanear =
    writable &&
    (pallet.estado === 'CREADO' ||
      pallet.estado === 'EN_CONSTRUCCION') &&
    activos.length < pallet.kitsObjetivo;

  const puedeFinalizar =
    writable &&
    (pallet.estado === 'EN_CONSTRUCCION' || pallet.estado === 'CREADO') &&
    activos.length > 0;

  const puedeMarcarListo = writable && pallet.estado === 'COMPLETO';

  return (
    <div className="space-y-6 py-2">
      <button
        type="button"
        className="linkish"
        onClick={() => id && navigate(ROUTES.demandaPalletizacion(id))}
      >
        {t('palletBuild.back')}
      </button>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-semibold text-foreground">{pallet.codigo}</h1>
          <Badge>{t(`palletization.palletEstado.${pallet.estado}`)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('palletBuild.headerLine', {
            destino: pallet.destinoNombre,
            seq: pallet.sequence,
            actual: activos.length,
            objetivo: pallet.kitsObjetivo,
          })}
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {pallet.estado === 'CREADO' && writable ? (
        <Button type="button" disabled={ocupado} onClick={() => void iniciar()}>
          {t('palletBuild.start')}
        </Button>
      ) : null}

      {puedeEscanear ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">{t('palletBuild.scanTitle')}</h2>
          <FormField label={t('palletBuild.codigoKit')} htmlFor="pallet-kit">
            <Input
              id="pallet-kit"
              value={codigoKit}
              onChange={(e) => setCodigoKit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void escanear();
                }
              }}
              autoFocus
            />
          </FormField>
          <Button type="button" disabled={ocupado || !codigoKit.trim()} onClick={() => void escanear()}>
            {t('palletBuild.scanConfirm')}
          </Button>
        </section>
      ) : null}

      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">{t('palletBuild.itemsTitle')}</h2>
        {activos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('palletBuild.itemsEmpty')}</p>
        ) : (
          <ul className="space-y-1">
            {activos.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono">{item.kitCodigo}</span>
                {writable &&
                (pallet.estado === 'EN_CONSTRUCCION' || pallet.estado === 'CREADO') &&
                item.kitCodigo ? (
                  <button
                    type="button"
                    className="text-xs text-error linkish"
                    disabled={ocupado}
                    onClick={() => void retirar(item.kitCodigo!)}
                  >
                    {t('palletBuild.removeKit')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {puedeFinalizar ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">{t('palletBuild.finalizeTitle')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t('palletBuild.pesoBruto')} htmlFor="pallet-bruto">
              <Input id="pallet-bruto" value={pesoBruto} onChange={(e) => setPesoBruto(e.target.value)} type="number" />
            </FormField>
            <FormField label={t('palletBuild.alto')} htmlFor="pallet-alto">
              <Input id="pallet-alto" value={alto} onChange={(e) => setAlto(e.target.value)} type="number" step="0.01" />
            </FormField>
            <FormField label={t('palletBuild.ancho')} htmlFor="pallet-ancho">
              <Input id="pallet-ancho" value={ancho} onChange={(e) => setAncho(e.target.value)} type="number" step="0.01" />
            </FormField>
            <FormField label={t('palletBuild.largo')} htmlFor="pallet-largo">
              <Input id="pallet-largo" value={largo} onChange={(e) => setLargo(e.target.value)} type="number" step="0.01" />
            </FormField>
          </div>
          <Button type="button" disabled={ocupado} onClick={() => void finalizar()}>
            {t('palletBuild.finalize')}
          </Button>
        </section>
      ) : null}

      {pallet.pesoBrutoKg ? (
        <p className="text-sm text-muted-foreground">
          {t('palletBuild.measuresLine', {
            bruto: pallet.pesoBrutoKg,
            neto: pallet.pesoNetoKg ?? '—',
            alto: pallet.altoM ?? '—',
            ancho: pallet.anchoM ?? '—',
            largo: pallet.largoM ?? '—',
          })}
        </p>
      ) : null}

      {puedeMarcarListo ? (
        <Button type="button" disabled={ocupado} onClick={() => void marcarListo()}>
          {t('palletBuild.markReady')}
        </Button>
      ) : null}

      {pallet.estado === 'LISTO_PARA_DESPACHO' ? (
        <p className="text-sm font-medium text-success">{t('palletBuild.readyHint')}</p>
      ) : null}
    </div>
  );
}
