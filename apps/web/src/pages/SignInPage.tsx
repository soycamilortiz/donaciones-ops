import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { AuthLayout } from '@/components/templates/AuthLayout';
import { ROUTES } from '@/lib/constants';
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
    <AuthLayout title={t('auth.signIn')}>
      <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
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
        <Button type="submit" size="lg" className="w-full">
          {t('auth.signIn')}
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
