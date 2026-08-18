import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { fetchCaptcha } from '../lib/api';

type Props = {
  refreshKey: number;
};

export default function CaptchaFields({ refreshKey }: Props) {
  const [captchaId, setCaptchaId] = useState('');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  // El API decide: con CAPTCHA_DISABLED no manda desafío y el campo no se pinta.
  const [deshabilitado, setDeshabilitado] = useState(false);
  const { t } = useTranslation();

  const load = useCallback(async () => {
    setError(null);
    try {
      const captcha = await fetchCaptcha();
      setDeshabilitado(Boolean(captcha.disabled));
      setCaptchaId(captcha.captchaId);
      setSvg(captcha.svg);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.captchaError'));
    }
  }, [t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey no se usa dentro del efecto, es el disparador explícito para pedir otro captcha.
  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (deshabilitado) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <input type="hidden" name="captchaId" value={captchaId} />
      <div className="flex items-stretch gap-3">
        <div className="flex h-[62px] flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
          {svg ? (
            <div
              className="flex h-full w-full items-center justify-center [&>svg]:h-full"
              aria-hidden="true"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: el SVG lo genera svg-captcha en nuestra propia API, no viene de entrada del usuario.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <p className="px-2 text-center text-xs text-muted-foreground">
              {t('auth.captchaLoading')}
            </p>
          )}
        </div>
        {/* Icono y ancho fijo: con la etiqueta escrita, «Otro captcha» se comía
            122 de los 375 px de un móvil y dejaba la imagen en 152. El captcha
            está distorsionado a propósito; comprimido no hay quien lo lea. */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => void load()}
          aria-label={t('auth.captchaImage')}
          title={t('auth.captchaImage')}
        >
          <Icon name="refresh" size={18} />
        </Button>
      </div>
      <FormField label={t('auth.captchaText')} htmlFor="captchaAnswer" error={error ?? undefined}>
        <Input
          id="captchaAnswer"
          name="captchaAnswer"
          required
          autoComplete="off"
          spellCheck={false}
          invalid={Boolean(error)}
        />
      </FormField>
    </div>
  );
}

/**
 * Devuelve `{}` cuando el captcha está apagado: los campos no existen en el
 * formulario y mandarlos vacíos haría fallar la validación del API.
 */
export function readCaptcha(form: FormData): { captchaId?: string; captchaAnswer?: string } {
  const captchaId = form.get('captchaId');
  const captchaAnswer = form.get('captchaAnswer');
  if (captchaId === null || captchaAnswer === null) {
    return {};
  }
  return { captchaId: String(captchaId), captchaAnswer: String(captchaAnswer) };
}

export function useCaptchaRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);
  return {
    refreshKey,
    refreshCaptcha: () => setRefreshKey((value) => value + 1),
    /**
     * Takes the form element, not the event: React nulls `currentTarget` once
     * the handler yields, and every caller awaits the request first. Reading it
     * from the event left a stale answer sitting under a freshly drawn captcha.
     */
    onSubmitFailed: (form: HTMLFormElement | null) => {
      const answer = form?.elements.namedItem('captchaAnswer');
      if (answer instanceof HTMLInputElement) {
        answer.value = '';
      }
      setRefreshKey((value) => value + 1);
    },
  };
}
