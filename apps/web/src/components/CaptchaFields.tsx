import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
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
  const { t } = useTranslation();

  const load = useCallback(async () => {
    setError(null);
    try {
      const captcha = await fetchCaptcha();
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
        <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>
          {t('auth.captchaImage')}
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
