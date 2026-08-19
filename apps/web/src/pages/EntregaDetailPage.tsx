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
import {
  confirmarEntrega,
  getContextoEntrega,
  type EntregaContexto,
  type EntregaEstadoPod,
  type ProofOfDelivery,
} from '@/features/entrega/entrega-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

export default function EntregaDetailPage() {
  const { viajeId = '' } = useParams();
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const { avisar } = useToast();
  const [ctx, setCtx] = useState<EntregaContexto | null>(null);
  const [pod, setPod] = useState<ProofOfDelivery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');
  const [receiverDocument, setReceiverDocument] = useState('');
  const [cantidadRecibida, setCantidadRecibida] = useState('');
  const [cantidadDanada, setCantidadDanada] = useState('0');
  const [observaciones, setObservaciones] = useState('');

  const cargar = useCallback(async () => {
    if (!viajeId) {
      return;
    }
    try {
      const data = await getContextoEntrega(request, orgId, viajeId);
      setCtx(data);
      setCantidadRecibida(String(data.kitsEsperados));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('entregas.loadError'));
    } finally {
      setCargando(false);
    }
  }, [orgId, request, t, viajeId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const enviar = async () => {
    if (!viajeId || !receivedBy.trim()) {
      avisar(t('entregas.receptorRequired'), { tono: 'error' });
      return;
    }
    setGuardando(true);
    try {
      const result = await confirmarEntrega(request, orgId, viajeId, {
        receivedBy: receivedBy.trim(),
        receiverDocument: receiverDocument.trim() || undefined,
        cantidadRecibida: Number(cantidadRecibida),
        cantidadDanada: Number(cantidadDanada),
        observaciones: observaciones.trim() || undefined,
      });
      setPod(result);
      avisar(t('entregas.confirmOk'));
      await cargar();
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('entregas.saveError'), { tono: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  if (!can('inventory:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('entregas.noPermission')}</p>;
  }

  if (cargando) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> {t('common.loading')}
      </p>
    );
  }

  if (!ctx) {
    return <p className="py-8 text-sm text-error">{error ?? t('entregas.loadError')}</p>;
  }

  const yaEntregado = ctx.entregaEstado === 'COMPLETA' || pod?.estado === 'COMPLETA';

  return (
    <div className="mx-auto max-w-xl space-y-6 py-2">
      <div className="space-y-1">
        <Link className="text-sm text-muted-foreground linkish" to={ROUTES.entregas}>
          ← {t('entregas.back')}
        </Link>
        <h1 className="font-mono text-2xl font-semibold text-foreground">{ctx.viajeCodigo}</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.despachoCodigo} · {ctx.destinoNombre}
        </p>
      </div>

      <div className="rounded-lg border border-border p-4 text-sm">
        <p>{t('entregas.resumen', { kits: ctx.kitsEsperados, pallets: ctx.palletsCount })}</p>
        {ctx.pallets.length > 0 ? (
          <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
            {ctx.pallets.map((p) => (
              <li key={p.id}>
                {p.codigo} · {p.kitsEsperados} kits
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {pod || ctx.entregaEstado ? (
        <div className="rounded-lg border border-border p-4">
          <Badge>
            {t(`entregas.estado.${(pod?.estado ?? ctx.entregaEstado) as EntregaEstadoPod}`)}
          </Badge>
          {pod ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('entregas.podLine', {
                recibida: pod.cantidadRecibida ?? 0,
                esperada: pod.cantidadEsperada ?? ctx.kitsEsperados,
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      {can('inventory:write') && !yaEntregado ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <FormField label={t('entregas.receivedBy')} htmlFor="receivedBy">
            <Input
              id="receivedBy"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t('entregas.receiverDocument')} htmlFor="receiverDocument">
            <Input
              id="receiverDocument"
              value={receiverDocument}
              onChange={(e) => setReceiverDocument(e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('entregas.cantidadRecibida')} htmlFor="cantidadRecibida">
              <Input
                id="cantidadRecibida"
                type="number"
                min={0}
                value={cantidadRecibida}
                onChange={(e) => setCantidadRecibida(e.target.value)}
              />
            </FormField>
            <FormField label={t('entregas.cantidadDanada')} htmlFor="cantidadDanada">
              <Input
                id="cantidadDanada"
                type="number"
                min={0}
                value={cantidadDanada}
                onChange={(e) => setCantidadDanada(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label={t('entregas.observaciones')} htmlFor="observaciones">
            <Input
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </FormField>
          <Button disabled={guardando} type="submit">
            {t('entregas.confirmar')}
          </Button>
        </form>
      ) : null}

      <Link className="text-sm linkish" to={ROUTES.transporteDetalle(viajeId)}>
        {t('entregas.verTransporte')}
      </Link>
    </div>
  );
}
