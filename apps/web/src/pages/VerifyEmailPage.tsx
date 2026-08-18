import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { AuthLayout } from '@/components/templates/AuthLayout';
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

  // One-shot from the mail link: `complete` is redefined on every render, so
  // listing it would re-verify the token on each keystroke.
  // biome-ignore lint/correctness/useExhaustiveDependencies: token from the URL should run once
  useEffect(() => {
    if (!token) return;
    void complete({ token });
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
    <AuthLayout title={t('verifyEmail.title')}>
      <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <p className="text-sm text-muted-foreground">
          {t('verifyEmail.subtitle', { correo: correo || '…' })}
        </p>
        <p className="text-sm text-muted-foreground">{t('verifyEmail.checkLogs')}</p>
        <FormField label={t('auth.email')} htmlFor="verificar-correo" required>
          <Input
            id="verificar-correo"
            type="email"
            required
            autoComplete="email"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
          />
        </FormField>
        <FormField label={t('verifyEmail.code')} htmlFor="verificar-codigo" required>
          <Input
            id="verificar-codigo"
            name="codigo"
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
            pattern="[0-9]{6}"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
          />
        </FormField>
        {error ? (
          <p role="alert" className="text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
        {info ? (
          <p role="status" className="text-sm text-muted-foreground">
            {info}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={ocupado}>
          {ocupado ? t('verifyEmail.verifying') : t('verifyEmail.submit')}
        </Button>
        <Button
          type="button"
          variant="link"
          className="w-full"
          disabled={ocupado}
          onClick={() => void onResend()}
        >
          {t('verifyEmail.resend')}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
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
