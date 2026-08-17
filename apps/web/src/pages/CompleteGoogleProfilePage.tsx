import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  clearGoogleProfileToken,
  readGoogleProfileToken,
} from '@/components/GoogleSignInButton';
import { useSession } from '@/lib/AuthProvider';
import { type AuthSession, apiRequest } from '@/lib/api';
import { ROUTES } from '@/lib/constants';

type LocationState = {
  correo?: string;
  nombre?: string;
  usuarioSugerido?: string;
};

export default function CompleteGoogleProfilePage() {
  const { t } = useTranslation();
  const { setSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const profileToken = readGoogleProfileToken();

  const [nombre, setNombre] = useState(state.nombre ?? '');
  const [usuario, setUsuario] = useState(state.usuarioSugerido ?? '');
  const [correo] = useState(state.correo ?? '');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (!profileToken) {
    return <Navigate to={ROUTES.signUp} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOcupado(true);
    try {
      const session = await apiRequest<AuthSession>('/api/v1/auth/google/completar', null, {
        method: 'POST',
        body: JSON.stringify({
          profileToken,
          usuario: usuario.trim(),
          nombre: nombre.trim() || undefined,
        }),
      });
      clearGoogleProfileToken();
      setSession(session.accessToken);
      navigate('/empezar');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.googleCompleteError'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="brand">
        SOS Chocó
      </Link>
      <form className="form auth-form" onSubmit={(event) => void onSubmit(event)}>
        <h1>{t('auth.googleCompleteTitle')}</h1>
        <p className="muted">{t('auth.googleCompleteSubtitle')}</p>
        {correo ? (
          <p className="muted">
            {t('auth.email')}: {correo}
          </p>
        ) : null}
        <label className="field">
          {t('auth.name')}
          <input
            name="nombre"
            required
            minLength={2}
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <label className="field">
          {t('auth.username')}
          <input
            name="usuario"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9._]+"
            title={t('auth.usernameHint')}
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <button className="button" type="submit" disabled={ocupado}>
          {ocupado ? t('auth.googleCompleting') : t('auth.googleCompleteSubmit')}
        </button>
      </form>
    </div>
  );
}
