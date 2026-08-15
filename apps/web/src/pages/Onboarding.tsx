import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { type Me, ORGANIZATION_TIPOS, storeOrgId } from '../lib/api';
import { useApi } from '../lib/useApi';

type OutletCtx = { me: Me; refresh: () => Promise<void> };

export default function Onboarding() {
  const { me, refresh } = useOutletContext<OutletCtx>();
  const request = useApi();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState('CENTRO_ACOPIO');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const payload = {
      nombre: String(data.get('nombre') ?? '').trim(),
      correo: String(data.get('correo') ?? '').trim(),
      telefono: String(data.get('telefono') ?? '').trim() || undefined,
      descripcion: String(data.get('descripcion') ?? '').trim() || undefined,
      tipo,
      tipoDetalle: String(data.get('tipoDetalle') ?? '').trim() || undefined,
    };

    try {
      const org = await request<{ id: string }>('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      storeOrgId(org.id);
      await refresh();
      navigate('/app/acopios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    }
  }

  return (
    <section>
      <p className="eyebrow">
        <Link to="/empezar">Volver</Link>
      </p>
      <h1>Crear organización</h1>
      <p className="lede">
        Solo caracterización (quiénes son y cómo contactarlos). Los centros de acopio —recibir o
        enviar donaciones— se cargan en Acopios, ya dentro del panel.
      </p>
      <form className="form" onSubmit={(event) => void onSubmit(event)}>
        <label className="field">
          Nombre
          <input name="nombre" required minLength={2} />
        </label>
        <label className="field">
          Correo
          <input name="correo" type="email" required defaultValue={me.correo} />
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
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <button className="button" type="submit">
          Crear organización
        </button>
      </form>
    </section>
  );
}
