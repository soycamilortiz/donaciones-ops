import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SkeletonList } from '../components/atoms/Skeleton';
import { ConfirmDialog } from '../components/molecules/ConfirmDialog';
import { useOrg } from '../components/OrgGate';
import { ACOPIO_FLUJOS, type Acopio } from '../lib/api';
import { useApi } from '../lib/useApi';

export default function AcopiosPage() {
  const { orgId, can } = useOrg();
  const { t } = useTranslation();
  const request = useApi();
  const [rows, setRows] = useState<Acopio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  // Id de la fila pendiente de confirmar; null = dialogo cerrado.
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [editing, setEditing] = useState<Acopio | null>(null);

  async function load() {
    try {
      setRows(await request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`));
    } finally {
      // En `finally` para que un fallo no deje el esqueleto girando para siempre;
      // el error se muestra aparte.
      setCargando(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load() se redefine en cada render; orgId es el disparador real de la recarga.
  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    });
  }, [orgId]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const latRaw = String(data.get('lat') ?? '').trim();
    const lngRaw = String(data.get('lng') ?? '').trim();
    const payload = {
      nombre: String(data.get('nombre') ?? '').trim(),
      flujo: String(data.get('flujo') ?? 'AMBOS'),
      telefono: String(data.get('telefono') ?? '').trim() || undefined,
      descripcion: String(data.get('descripcion') ?? '').trim() || undefined,
      municipio: String(data.get('municipio') ?? '').trim() || undefined,
      direccion: String(data.get('direccion') ?? '').trim() || undefined,
      lat: latRaw ? Number(latRaw) : undefined,
      lng: lngRaw ? Number(lngRaw) : undefined,
    };
    try {
      if (editing) {
        await request(`/api/v1/organizations/${orgId}/acopios/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await request(`/api/v1/organizations/${orgId}/acopios`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function onReactivate(id: string) {
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/acopios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reactivar');
    }
  }

  async function onRemove(id: string) {
    setError(null);
    setEliminando(true);
    try {
      await request(`/api/v1/organizations/${orgId}/acopios/${id}`, {
        method: 'DELETE',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('acopios.deleteError'));
    } finally {
      setEliminando(false);
      setPorConfirmar(null);
    }
  }

  return (
    <section className="panel">
      <h1>{t('acopios.title')}</h1>
      <p className="muted">{t('acopios.subtitle')}</p>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {cargando ? <SkeletonList filas={3} etiqueta={t('common.loading')} /> : null}

      {!cargando && rows.length === 0 ? <p className="muted">{t('acopios.empty')}</p> : null}

      <ul className="stack-list">
        {rows.map((row) => (
          <li key={row.id} className={row.isActive === false ? 'is-inactive' : undefined}>
            <div>
              <strong>{row.nombre}</strong>
              {row.isActive === false ? (
                <span className="badge-baja"> {t('acopios.inactive')}</span>
              ) : null}
              <p className="muted">
                {ACOPIO_FLUJOS.find((item) => item.value === row.flujo)?.label}
                {' · '}
                {[row.municipio, row.direccion, row.telefono].filter(Boolean).join(' · ') ||
                  'Sin datos de ubicación'}
              </p>
            </div>
            {can('acopios:write') ? (
              <div className="row-actions">
                <button type="button" className="linkish" onClick={() => setEditing(row)}>
                  Editar
                </button>
                {row.isActive === false ? (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => void onReactivate(row.id)}
                  >
                    Reactivar
                  </button>
                ) : (
                  <button type="button" className="linkish" onClick={() => setPorConfirmar(row.id)}>
                    Dar de baja
                  </button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {can('acopios:write') ? (
        <form className="form" key={editing?.id ?? 'new'} onSubmit={(event) => void onSave(event)}>
          <h2>{editing ? 'Editar acopio' : 'Nuevo acopio'}</h2>
          <label className="field">
            Nombre
            <input
              name="nombre"
              required
              defaultValue={editing?.nombre ?? ''}
              key={editing?.id ?? 'new'}
            />
          </label>
          <label className="field">
            Flujo de donaciones
            <select name="flujo" defaultValue={editing?.flujo ?? 'RECIBIR'}>
              {ACOPIO_FLUJOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Municipio
            <input name="municipio" defaultValue={editing?.municipio ?? ''} />
          </label>
          <label className="field">
            Dirección
            <input name="direccion" defaultValue={editing?.direccion ?? ''} />
          </label>
          <label className="field">
            Teléfono
            <input name="telefono" defaultValue={editing?.telefono ?? ''} />
          </label>
          <label className="field">
            Descripción
            <textarea name="descripcion" rows={2} defaultValue={editing?.descripcion ?? ''} />
          </label>
          <div className="inline-form">
            <label className="field">
              Lat
              <input
                name="lat"
                type="number"
                step="any"
                inputMode="decimal"
                defaultValue={editing?.lat ?? ''}
              />
            </label>
            <label className="field">
              Lng
              <input
                name="lng"
                type="number"
                step="any"
                inputMode="decimal"
                defaultValue={editing?.lng ?? ''}
              />
            </label>
          </div>
          <button className="button" type="submit">
            Guardar
          </button>
          {editing ? (
            <button type="button" className="linkish" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          ) : null}
        </form>
      ) : null}
      <ConfirmDialog
        abierto={porConfirmar !== null}
        titulo={t('confirm.deleteAcopioTitle')}
        descripcion={t('confirm.deleteAcopioDescription')}
        ocupado={eliminando}
        onConfirmar={() => porConfirmar && void onRemove(porConfirmar)}
        onCancelar={() => setPorConfirmar(null)}
      />
    </section>
  );
}
