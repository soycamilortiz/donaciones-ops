import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSession } from '../lib/AuthProvider';
import { fetchApiHealth, type ApiHealth, type HealthStatus } from '../lib/health';

const MODULES = [
  {
    path: '/app/acopios',
    title: 'Centros de acopio',
    body: 'Bodegas WMS: ubicación, contacto y operación de cada sede.',
  },
  {
    path: '/app/usuarios',
    title: 'Usuarios y roles',
    body: 'Colaboradores por organización, con permisos por rol.',
  },
  {
    path: '/donaciones',
    title: 'Donaciones',
    body: 'Registro y seguimiento de ayudas. Próximo módulo.',
  },
] as const;

function statusLabel(status: HealthStatus): string {
  if (status === 'checking') return 'Comprobando';
  if (status === 'ok') return 'En línea';
  return 'Sin respuesta';
}

export default function Landing() {
  const { isAuthenticated, logout } = useSession();
  const [health, setHealth] = useState<ApiHealth>({
    liveness: 'checking',
    readiness: 'checking',
  });

  useEffect(() => {
    void fetchApiHealth().then(setHealth);
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">SOS Chocó</span>
        <nav className="topbar-actions">
          <a href="/api/docs">API</a>
          {isAuthenticated ? (
            <>
              <Link className="button" to="/app">
                Ir al panel
              </Link>
              <button type="button" className="linkish" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/sign-in">Entrar</Link>
              <Link className="button" to="/sign-up">
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </header>

      <header className="hero">
        <p className="eyebrow">Operación logística</p>
        <h1>SOS Chocó</h1>
        <p className="lede">
          Coordinación de donaciones, centros de acopio y envíos. Creá una
          cuenta; la organización es opcional hasta que armes la tuya o te
          inviten.
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
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
