import { type CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/AuthProvider';
import { type AuthSession, apiRequest, type GoogleAuthResult } from '@/lib/api';
import { ROUTES } from '@/lib/constants';

const PROFILE_TOKEN_KEY = 'soschoco.googleProfileToken';

export function storeGoogleProfileToken(token: string): void {
  sessionStorage.setItem(PROFILE_TOKEN_KEY, token);
}

export function readGoogleProfileToken(): string | null {
  return sessionStorage.getItem(PROFILE_TOKEN_KEY);
}

export function clearGoogleProfileToken(): void {
  sessionStorage.removeItem(PROFILE_TOKEN_KEY);
}

type Props = {
  onError?: (message: string) => void;
};

export function GoogleSignInButton({ onError }: Props) {
  const { t } = useTranslation();
  const { setSession } = useSession();
  const navigate = useNavigate();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return null;
  }

  async function handleSuccess(response: CredentialResponse) {
    if (!response.credential) {
      onError?.(t('auth.googleError'));
      return;
    }
    try {
      const result = await apiRequest<GoogleAuthResult>('/api/v1/auth/google', null, {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential }),
      });
      if ('accessToken' in result) {
        setSession((result as AuthSession).accessToken);
        navigate('/empezar');
        return;
      }
      if ('needsProfile' in result && result.needsProfile) {
        storeGoogleProfileToken(result.profileToken);
        navigate(ROUTES.completarGoogle, {
          state: {
            correo: result.correo,
            nombre: result.nombre,
            usuarioSugerido: result.usuarioSugerido,
          },
        });
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : t('auth.googleError'));
    }
  }

  return (
    <div className="auth-google">
      <GoogleLogin
        onSuccess={(response) => void handleSuccess(response)}
        onError={() => onError?.(t('auth.googleError'))}
        text="continue_with"
        shape="rectangular"
        theme="outline"
        size="large"
      />
    </div>
  );
}
