import { type FormEvent, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ORGANIZATION_TIPOS, storeOrgId, type Me } from '../lib/api';
import { useApi } from '../lib/useApi';

type OutletCtx = { me: Me; refresh: () => Promise<void> };

export default function Onboarding() {
  const { refresh } = useOutletContext<OutletCtx>();
  const request = useApi();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState('CENTRO_ACOPIO');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const acopioNombre = String(data.get('acopioNombre') ?? '').trim();
    const payload = {
      nombre: String(data.get('nombre') ?? '').trim(),
      correo: String(data.get('correo') ?? '').trim(),
      telefono: String(data.get('telefono') ?? '').trim() || undefined,
      descripcion: String(data.get('descripcion') ?? '').trim() || undefined,
      tipo,
      tipoDetalle: String(data.get('tipoDetalle') ?? '').trim() || undefined,
      acopio: acopioNombre
        ? {
            nombre: acopioNombre,
            municipio: String(data.get('municipio') ?? '').trim() || undefined,
            telefono: String(data.get('acopioTelefono') ?? '').trim() || undefined,
          }
        : undefined,
    };

    try {
      const org = await request<{ id: string }>('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      storeOrgId(org.id);
      await refresh();
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    }
  }

  return (
    <div className="page">
      <h1>Caracterizar organización</h1>
      <p className="lede">
        Todavía no pertenecés a ninguna organización. Creá la primera: tipo,
        contacto y, si aplica, un centro de acopio inicial.
      </p>
      <form className="form" onSubmit={(event) => void onSubmit(event)}>
        <label className="field">
          Nombre
          <input name="nombre" required minLength={2} />
        </label>
        <label className="field">
          Correo
          <input name="correo" type="email" required />
        </label>
        <label className="field">
          Tipo
          <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
            {ORGANIZATION_TIPOS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {tipo === 'OTRO' ? (
          <label className="field">
            Detalle del tipo
            <input name="tipoDetalle" />
          </label>
        ) : null}
        <label className="field">
          Teléfono
          <input name="telefono" />
        </label>
        <label className="field">
          Descripción
          <textarea name="descripcion" rows={3} />
        </label>
        <h2>Acopio inicial (opcional)</h2>
        <label className="field">
          Nombre del acopio
          <input name="acopioNombre" />
        </label>
        <label className="field">
          Municipio
          <input name="municipio" />
        </label>
        <label className="field">
          Teléfono del acopio
          <input name="acopioTelefono" />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="button" type="submit">
          Crear organización
        </button>
      </form>
    </div>
  );
}
