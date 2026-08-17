import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { AuthLayout } from '@/components/templates/AuthLayout';
import { ROUTES } from '@/lib/constants';
import CaptchaFields, { readCaptcha, useCaptchaRefresh } from '../components/CaptchaFields';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { apiRequest, type RegisterPendingVerification } from '../lib/api';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { refreshKey, onSubmitFailed } = useCaptchaRefresh();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
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
      setError(err instanceof Error ? err.message : t('auth.registerError'));
      onSubmitFailed(event);
    }
  }

  return (
    // Card mas ancha en desktop para el layout a dos columnas; en movil queda
    // en max-w-md (una sola columna, mobile-first).
    <AuthLayout title={t('auth.createAccount')} className="sm:max-w-2xl">
      <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <GoogleSignInButton onError={setError} />
        <p className="text-center text-sm text-muted-foreground">{t('auth.orEmail')}</p>
        {/* Mobile-first: una columna; a partir de sm, pares a dos columnas. */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label={t('auth.name')} htmlFor="nombre" required>
            <Input id="nombre" name="nombre" required minLength={2} autoComplete="name" />
          </FormField>
          <FormField
            label={t('auth.username')}
            htmlFor="usuario"
            required
            hint={t('auth.usernameHint')}
          >
            <Input
              id="usuario"
              name="usuario"
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9._]+"
              title={t('auth.usernameHint')}
              autoComplete="username"
            />
          </FormField>
        </div>
        <FormField label={t('auth.email')} htmlFor="correo" required>
          <Input id="correo" name="correo" type="email" required autoComplete="email" />
        </FormField>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label={t('auth.password')} htmlFor="password" required>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </FormField>
          <FormField
            label={t('auth.confirmPassword')}
            htmlFor="confirm"
            required
            hint={t('auth.passwordHint')}
          >
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </FormField>
        </div>
        <CaptchaFields refreshKey={refreshKey} />
        {error ? (
          <p role="alert" className="text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full">
          {t('auth.signUpSubmit')}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link
            to={ROUTES.signIn}
            className="font-semibold text-primary underline underline-offset-4"
          >
            {t('auth.signIn')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
