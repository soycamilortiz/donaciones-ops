import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import CaptchaFields, { readCaptcha, useCaptchaRefresh } from '../components/CaptchaFields';
import { apiRequest, type RegisterPendingVerification } from '../lib/api';
import { ROUTES } from '../lib/constants';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { refreshKey, onSubmitFailed } = useCaptchaRefresh();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');
    if (password !== confirm) {
      setError(t('auth.passwordsMismatch'));
      return;
    }

    const correo = String(data.get('correo') ?? '').trim();
    try {
      await apiRequest<RegisterPendingVerification>('/api/v1/auth/register', null, {
        method: 'POST',
        body: JSON.stringify({
          nombre: String(data.get('nombre') ?? '').trim(),
          usuario: String(data.get('usuario') ?? '').trim(),
          correo,
          password,
          ...readCaptcha(data),
        }),
      });
      navigate(`${ROUTES.verificarCorreo}?correo=${encodeURIComponent(correo)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signUpError'));
      onSubmitFailed(event);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="brand">
        SOS Chocó
      </Link>
      <form className="form auth-form" onSubmit={(event) => void onSubmit(event)}>
        <h1>{t('auth.createAccount')}</h1>
        <label className="field">
          {t('auth.name')}
          <input name="nombre" required minLength={2} autoComplete="name" />
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
          />
        </label>
        <label className="field">
          {t('auth.email')}
          <input name="correo" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          {t('auth.password')}
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          {t('auth.confirmPassword')}
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <p className="muted">{t('auth.passwordHint')}</p>
        <CaptchaFields refreshKey={refreshKey} />
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <button className="button" type="submit">
          {t('auth.submitSignUp')}
        </button>
        <p className="muted">
          {t('auth.hasAccount')} <Link to={ROUTES.signIn}>{t('auth.signIn')}</Link>
        </p>
      </form>
    </div>
  );
}
