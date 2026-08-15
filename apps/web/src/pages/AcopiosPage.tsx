import { type FormEvent, useEffect, useState } from 'react';
import { useOrg } from '../components/OrgGate';
import { useApi } from '../lib/useApi';
import type { Acopio } from '../lib/api';

export default function AcopiosPage() {
  const { orgId, can } = useOrg();
  const request = useApi();
  const [rows, setRows] = useState<Acopio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Acopio | null>(null);

  async function load() {
    setRows(await request<Acopio[]>(`/api/v1/organizations/${orgId}/acopios`));
  }

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    });
  }, [orgId]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const latRaw = String(data.get('lat') ?? '').trim();
    const lngRaw = String(data.get('lng') ?? '').trim();
    const payload = {
      nombre: String(data.get('nombre') ?? '').trim(),
      telefono: String(data.get('telefono') ?? '').trim() || undefined,
      descripcion: String(data.get('descripcion') ?? '').trim() || undefined,
      municipio: String(data.get('municipio') ?? '').trim() || undefined,
      direccion: String(data.get('direccion') ?? '').trim() || undefined,
      lat: latRaw ? Number(latRaw) : undefined,
      lng: lngRaw ? Number(lngRaw) : undefined,
    };
    try {
      if (editing) {
        await request(
          `/api/v1/organizations/${orgId}/acopios/${editing.id}`,
          { method: 'PATCH', body: JSON.stringify(payload) },
        );
      } else {
        await request(`/api/v1/organizations/${orgId}/acopios`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function onRemove(id: string) {
    setError(null);
    try {
      await request(`/api/v1/organizations/${orgId}/acopios/${id}`, {
        method: 'DELETE',
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  return (
    <section className="panel">
      <h1>Centros de acopio</h1>
      {error ? <p className="error">{error}</p> : null}
      <ul className="stack-list">
        {rows.map((row) => (
          <li key={row.id}>
            <div>
              <strong>{row.nombre}</strong>
              <p className="muted">
                {[row.municipio, row.direccion, row.telefono]
                  .filter(Boolean)
                  .join(' · ') || 'Sin datos de ubicación'}
              </p>
            </div>
            {can('acopios:write') ? (
              <div className="row-actions">
                <button type="button" className="linkish" onClick={() => setEditing(row)}>
                  Editar
                </button>
                <button type="button" className="linkish" onClick={() => void onRemove(row.id)}>
                  Eliminar
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {can('acopios:write') ? (
        <form className="form" onSubmit={(event) => void onSave(event)}>
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
              <input name="lat" type="number" step="any" defaultValue={editing?.lat ?? ''} />
            </label>
            <label className="field">
              Lng
              <input name="lng" type="number" step="any" defaultValue={editing?.lng ?? ''} />
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
    </section>
  );
}
