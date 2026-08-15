import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CaptchaFields, {
  readCaptcha,
  useCaptchaRefresh,
} from '../components/CaptchaFields';
import { apiRequest, type AuthSession } from '../lib/api';
import { useSession } from '../lib/AuthProvider';

export default function SignUpPage() {
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { refreshKey, onSubmitFailed } = useCaptchaRefresh();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      const session = await apiRequest<AuthSession>(
        '/api/v1/auth/register',
        null,
        {
          method: 'POST',
          body: JSON.stringify({
            nombre: String(data.get('nombre') ?? '').trim(),
            usuario: String(data.get('usuario') ?? '').trim(),
            correo: String(data.get('correo') ?? '').trim(),
            password,
            ...readCaptcha(data),
          }),
        },
      );
      setSession(session.accessToken);
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar');
      onSubmitFailed(event);
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="brand">
        SOS Chocó
      </Link>
      <form className="form auth-form" onSubmit={(event) => void onSubmit(event)}>
        <h1>Crear cuenta</h1>
        <label className="field">
          Nombre
          <input name="nombre" required minLength={2} autoComplete="name" />
        </label>
        <label className="field">
          Usuario
          <input
            name="usuario"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9._]+"
            title="Letras, números, punto y guion bajo"
            autoComplete="username"
          />
        </label>
        <label className="field">
          Correo
          <input name="correo" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          Contraseña
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          Confirmar contraseña
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <p className="muted">Mínimo 8 caracteres, con letras y números.</p>
        <CaptchaFields refreshKey={refreshKey} />
        {error ? <p className="error">{error}</p> : null}
        <button className="button" type="submit">
          Registrarme
        </button>
        <p className="muted">
          ¿Ya tenés cuenta? <Link to="/sign-in">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
