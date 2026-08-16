import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import CaptchaFields, { readCaptcha, useCaptchaRefresh } from '../components/CaptchaFields';
import { useSession } from '../lib/AuthProvider';
import { type AuthSession, apiRequest } from '../lib/api';

export default function SignInPage() {
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
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
        <h1>{t('auth.signIn')}</h1>
        <label className="field">
          {t('auth.userOrEmail')}
          <input name="usuario" required minLength={3} autoComplete="username" />
        </label>
        <label className="field">
          {t('auth.password')}
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        <CaptchaFields refreshKey={refreshKey} />
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <button className="button" type="submit">
          {t('auth.signIn')}
        </button>
        <p className="muted">
          {t('auth.noAccount')} <Link to="/sign-up">{t('auth.signUp')}</Link>
        </p>
      </form>
    </div>
  );
}
