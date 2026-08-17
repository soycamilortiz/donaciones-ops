import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/AuthProvider';
import { type AuthSession, apiRequest } from '../lib/api';
import { ROUTES } from '../lib/constants';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const correoInicial = params.get('correo') ?? '';

  const [correo, setCorreo] = useState(correoInicial);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(Boolean(token));

  async function complete(body: { token?: string; correo?: string; codigo?: string }) {
    setError(null);
    setOcupado(true);
    try {
      const session = await apiRequest<AuthSession>('/api/v1/auth/verificar-correo', null, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setSession(session.accessToken);
      navigate('/empezar');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verifyEmail.error'));
    } finally {
      setOcupado(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void complete({ token });
    // One-shot from the mail link.
    // biome-ignore lint/correctness/useExhaustiveDependencies: token from the URL should run once
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await complete({ correo: correo.trim(), codigo: codigo.trim() });
  }

  async function onResend() {
    setError(null);
    setInfo(null);
    if (!correo.trim()) {
      setError(t('verifyEmail.needEmail'));
      return;
    }
    try {
      await apiRequest('/api/v1/auth/verificar-correo/reenviar', null, {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim() }),
      });
      setInfo(t('verifyEmail.resent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verifyEmail.error'));
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="brand">
        SOS Chocó
      </Link>
      <form className="form auth-form" onSubmit={(event) => void onSubmit(event)}>
        <h1>{t('verifyEmail.title')}</h1>
        <p className="muted">{t('verifyEmail.subtitle', { correo: correo || '…' })}</p>
        <p className="muted">{t('verifyEmail.checkLogs')}</p>
        <label className="field">
          {t('auth.email')}
          <input
            type="email"
            required
            autoComplete="email"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
          />
        </label>
        <label className="field">
          {t('verifyEmail.code')}
          <input
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
            pattern="[0-9]{6}"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        {info ? <p className="muted">{info}</p> : null}
        <button className="button" type="submit" disabled={ocupado}>
          {ocupado ? t('verifyEmail.verifying') : t('verifyEmail.submit')}
        </button>
        <button type="button" className="linkish" disabled={ocupado} onClick={() => void onResend()}>
          {t('verifyEmail.resend')}
        </button>
        <p className="muted">
          <Link to={ROUTES.signIn}>{t('auth.signIn')}</Link>
        </p>
      </form>
    </div>
  );
}
