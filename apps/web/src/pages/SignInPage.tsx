import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CaptchaFields, {
  readCaptcha,
  useCaptchaRefresh,
} from '../components/CaptchaFields';
import { apiRequest, type AuthSession } from '../lib/api';
import { useSession } from '../lib/AuthProvider';

export default function SignInPage() {
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { refreshKey, onSubmitFailed } = useCaptchaRefresh();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const session = await apiRequest<AuthSession>('/api/v1/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({
          usuario: String(data.get('usuario') ?? '').trim(),
          password: String(data.get('password') ?? ''),
          ...readCaptcha(data),
        }),
      });
      setSession(session.accessToken);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar');
      onSubmitFailed(event);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="brand">
        SOS Chocó
      </Link>
      <form className="form auth-form" onSubmit={(event) => void onSubmit(event)}>
        <h1>Entrar</h1>
        <label className="field">
          Usuario o correo
          <input name="usuario" required minLength={3} autoComplete="username" />
        </label>
        <label className="field">
          Contraseña
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        <CaptchaFields refreshKey={refreshKey} />
        {error ? <p className="error">{error}</p> : null}
        <button className="button" type="submit">
          Entrar
        </button>
        <p className="muted">
          ¿No tenés cuenta? <Link to="/sign-up">Registrate</Link>
        </p>
      </form>
    </div>
  );
}
