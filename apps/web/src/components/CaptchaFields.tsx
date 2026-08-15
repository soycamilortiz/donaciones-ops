import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { fetchCaptcha } from '../lib/api';

type Props = {
  refreshKey: number;
};

export default function CaptchaFields({ refreshKey }: Props) {
  const [captchaId, setCaptchaId] = useState('');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const captcha = await fetchCaptcha();
      setCaptchaId(captcha.captchaId);
      setSvg(captcha.svg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el captcha');
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey no se usa dentro del efecto, es el disparador explícito para pedir otro captcha.
  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <div className="captcha">
      <input type="hidden" name="captchaId" value={captchaId} />
      {svg ? (
        <div
          className="captcha-image"
          aria-hidden="true"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: el SVG lo genera svg-captcha en nuestra propia API, no viene de entrada del usuario.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="muted">Cargando captcha…</p>
      )}
      <button type="button" className="linkish" onClick={() => void load()}>
        Otro captcha
      </button>
      <label className="field">
        Texto del captcha
        <input name="captchaAnswer" required autoComplete="off" spellCheck={false} />
      </label>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}

export function readCaptcha(form: FormData) {
  return {
    captchaId: String(form.get('captchaId') ?? ''),
    captchaAnswer: String(form.get('captchaAnswer') ?? ''),
  };
}

export function useCaptchaRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);
  return {
    refreshKey,
    refreshCaptcha: () => setRefreshKey((value) => value + 1),
    onSubmitFailed: (event: FormEvent<HTMLFormElement>) => {
      const form = event.currentTarget;
      const answer = form?.elements.namedItem('captchaAnswer');
      if (answer instanceof HTMLInputElement) {
        answer.value = '';
      }
      setRefreshKey((value) => value + 1);
    },
  };
}
