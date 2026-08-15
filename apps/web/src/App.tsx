import { useEffect, useState } from 'react';
import { fetchApiHealth, type ApiHealth, type HealthStatus } from './lib/api';

const MODULES = [
  {
    path: '/donaciones',
    title: 'Donaciones',
    body: 'Registro, clasificación y seguimiento de ayudas recibidas.',
  },
  {
    path: '/acopio',
    title: 'Centros de acopio',
    body: 'Inventario y operación de los puntos de recepción.',
  },
  {
    path: '/envios',
    title: 'Envíos',
    body: 'Rutas y despachos hacia zonas remotas del Chocó.',
  },
] as const;

function statusLabel(status: HealthStatus): string {
  if (status === 'checking') return 'Comprobando';
  if (status === 'ok') return 'En línea';
  return 'Sin respuesta';
}

export default function App() {
  const [health, setHealth] = useState<ApiHealth>({
    liveness: 'checking',
    readiness: 'checking',
  });

  useEffect(() => {
    void fetchApiHealth().then(setHealth);
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Operación logística</p>
        <h1>SOS Chocó</h1>
        <p className="lede">
          Coordinación de donaciones, centros de acopio y envíos a zonas
          remotas. Este es el shell: cada módulo se publica como un contenedor
          independiente bajo el mismo dominio.
        </p>
      </header>

      <section className="status" aria-live="polite">
        <article>
          <span className={`dot ${health.liveness}`} />
          <div>
            <strong>API</strong>
            <p>{statusLabel(health.liveness)}</p>
          </div>
        </article>
        <article>
          <span className={`dot ${health.readiness}`} />
          <div>
            <strong>PostgreSQL</strong>
            <p>{statusLabel(health.readiness)}</p>
          </div>
        </article>
        <a className="docs" href="/api/docs">
          Documentación OpenAPI
        </a>
      </section>

      <section>
        <h2>Módulos</h2>
        <ul className="modules">
          {MODULES.map((module) => (
            <li key={module.path}>
              <p className="path">{module.path}</p>
              <h3>{module.title}</h3>
              <p>{module.body}</p>
              <span className="soon">Próximo contenedor</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
