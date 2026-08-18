import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { clearGoogleProfileToken, readGoogleProfileToken } from '@/components/GoogleSignInButton';
import { FormField } from '@/components/molecules/FormField';
import { AuthLayout } from '@/components/templates/AuthLayout';
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
    <AuthLayout title={t('auth.googleCompleteTitle')}>
      <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <p className="text-sm text-muted-foreground">{t('auth.googleCompleteSubtitle')}</p>
        {correo ? (
          <p className="text-sm text-muted-foreground">
            {t('auth.email')}: <span className="font-medium text-foreground">{correo}</span>
          </p>
        ) : null}
        <FormField label={t('auth.name')} htmlFor="google-nombre" required>
          <Input
            id="google-nombre"
            name="nombre"
            required
            minLength={2}
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </FormField>
        <FormField
          label={t('auth.username')}
          htmlFor="google-usuario"
          required
          hint={t('auth.usernameHint')}
        >
          <Input
            id="google-usuario"
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
        </FormField>
        {error ? (
          <p role="alert" className="text-sm font-medium text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={ocupado}>
          {ocupado ? t('auth.googleCompleting') : t('auth.googleCompleteSubmit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
