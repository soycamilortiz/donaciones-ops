import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { FormField } from '@/components/molecules/FormField';
import { AuthLayout } from '@/components/templates/AuthLayout';
import { ROUTES } from '@/lib/constants';
import CaptchaFields, { readCaptcha, useCaptchaRefresh } from '../components/CaptchaFields';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { useSession } from '../lib/AuthProvider';
import { ApiError, type AuthSession, apiRequest } from '../lib/api';

export default function SignInPage() {
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // UX-017: the captcha is single-use, so a second submit while the first is in
  // flight always fails with «captcha inválido» and looks like a wrong password.
  const [enviando, setEnviando] = useState(false);
  const { t } = useTranslation();
  const { refreshKey, onSubmitFailed } = useCaptchaRefresh();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) {
      return;
    }
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    setEnviando(true);
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
      if (err instanceof ApiError && err.status === 403) {
        const identifier = String(data.get('usuario') ?? '').trim();
        const q = identifier.includes('@') ? `?correo=${encodeURIComponent(identifier)}` : '';
        navigate(`${ROUTES.verificarCorreo}${q}`);
        return;
      }
      setError(err instanceof Error ? err.message : t('auth.signInError'));
      onSubmitFailed(form);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout title={t('auth.signIn')}>
      <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <GoogleSignInButton onError={setError} />
        <p className="text-center text-sm text-muted-foreground">{t('auth.orEmail')}</p>
        <FormField label={t('auth.userOrEmail')} htmlFor="usuario" required>
          <Input id="usuario" name="usuario" required minLength={3} autoComplete="username" />
        </FormField>
        <FormField label={t('auth.password')} htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </FormField>
        <CaptchaFields refreshKey={refreshKey} />
        {error ? (
          <p role="alert" className="text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {/* The button label already announces the pending state. */}
          {enviando ? <Spinner aria-hidden="true" className="h-4 w-4" /> : null}
          {enviando ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link
            to={ROUTES.signUp}
            className="font-semibold text-primary underline underline-offset-4"
          >
            {t('auth.signUp')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
