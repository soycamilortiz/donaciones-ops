import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import { FormField } from '@/components/molecules/FormField';
import { useToast } from '@/components/molecules/Toast';
import { crearRuta, listarRutas, type Ruta } from '@/features/transporte/rutas-service';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

type ParadaBorrador = { nombre: string; destinoNombre: string };

const paradaVacia = (): ParadaBorrador => ({ nombre: '', destinoNombre: '' });

export default function RutasPage() {
  const request = useApi();
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const { avisar } = useToast();
  const [rows, setRows] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [paradas, setParadas] = useState<ParadaBorrador[]>([paradaVacia(), paradaVacia()]);

  const cargar = useCallback(async () => {
    try {
      setRows(await listarRutas(request, orgId));
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('rutas.loadError'), { tono: 'error' });
    } finally {
      setCargando(false);
    }
  }, [avisar, orgId, request, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const agregarParada = () => setParadas((p) => [...p, paradaVacia()]);
  const quitarParada = (idx: number) =>
    setParadas((p) => (p.length <= 2 ? p : p.filter((_, i) => i !== idx)));

  const guardar = async () => {
    const validas = paradas.filter((p) => p.nombre.trim());
    if (!nombre.trim() || validas.length < 2) {
      avisar(t('rutas.validacion'), { tono: 'error' });
      return;
    }
    setGuardando(true);
    try {
      await crearRuta(request, orgId, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        paradas: validas.map((p, i) => ({
          sequence: i + 1,
          nombre: p.nombre.trim(),
          destinoNombre: p.destinoNombre.trim() || undefined,
        })),
      });
      avisar(t('rutas.createOk'));
      setMostrarForm(false);
      setNombre('');
      setDescripcion('');
      setParadas([paradaVacia(), paradaVacia()]);
      await cargar();
    } catch (err) {
      avisar(err instanceof Error ? err.message : t('rutas.saveError'), { tono: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  if (!can('rutas:read')) {
    return <p className="py-8 text-sm text-muted-foreground">{t('rutas.noPermission')}</p>;
  }

  if (cargando) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> {t('common.loading')}
      </p>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('rutas.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('rutas.subtitle')}</p>
        </div>
        {can('rutas:write') ? (
          <Button variant="secondary" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? t('common.cancel') : t('rutas.new')}
          </Button>
        ) : null}
      </div>

      {mostrarForm ? (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <FormField label={t('rutas.nombre')} htmlFor="ruta-nombre">
            <Input id="ruta-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </FormField>
          <FormField label={t('rutas.descripcion')} htmlFor="ruta-desc">
            <Input
              id="ruta-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </FormField>
          <div className="space-y-3">
            <p className="text-sm font-medium">{t('rutas.paradasTitle')}</p>
            {paradas.map((parada, idx) => (
              <div key={idx} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[auto_1fr_1fr]">
                <span className="flex h-11 items-center font-mono text-sm text-muted-foreground">
                  {idx + 1}.
                </span>
                <FormField label={t('rutas.paradaNombre')} htmlFor={`parada-n-${idx}`}>
                  <Input
                    id={`parada-n-${idx}`}
                    value={parada.nombre}
                    onChange={(e) =>
                      setParadas((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, nombre: e.target.value } : r)),
                      )
                    }
                    placeholder={t('rutas.paradaNombreHint')}
                  />
                </FormField>
                <FormField label={t('rutas.destinoNombre')} htmlFor={`parada-d-${idx}`}>
                  <Input
                    id={`parada-d-${idx}`}
                    value={parada.destinoNombre}
                    onChange={(e) =>
                      setParadas((rows) =>
                        rows.map((r, i) =>
                          i === idx ? { ...r, destinoNombre: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder={t('rutas.destinoNombreHint')}
                  />
                </FormField>
                {paradas.length > 2 ? (
                  <Button
                    className="sm:col-span-3 sm:justify-self-end"
                    variant="ghost"
                    onClick={() => quitarParada(idx)}
                  >
                    {t('rutas.quitarParada')}
                  </Button>
                ) : null}
              </div>
            ))}
            <Button variant="ghost" onClick={agregarParada}>
              {t('rutas.agregarParada')}
            </Button>
          </div>
          <Button disabled={guardando} onClick={() => void guardar()}>
            {t('rutas.guardar')}
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('rutas.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((ruta) => (
            <li key={ruta.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{ruta.codigo}</span>
                <span>{ruta.nombre}</span>
                <Badge>{t('rutas.paradasCount', { count: ruta.paradas.length })}</Badge>
              </div>
              <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
                {ruta.paradas.map((p) => (
                  <li key={p.sequence}>
                    {p.sequence}. {p.nombre}
                    {p.destinoNombre ? (
                      <span className="ml-2 text-foreground">→ {p.destinoNombre}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}

      <Link className="text-sm linkish" to={ROUTES.transporte}>
        {t('rutas.verTransporte')}
      </Link>
    </div>
  );
}
