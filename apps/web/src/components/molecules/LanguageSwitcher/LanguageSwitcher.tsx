import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/atoms/Select';
import { type Language, SUPPORTED_LANGUAGES } from '@/i18n';

const LABELS: Record<Language, string> = {
  es: 'Español',
  en: 'English',
};

/**
 * Language picker.
 *
 * A native `<select>` rather than a custom dropdown: it is keyboard and screen
 * reader accessible for free, and on mobile it opens the platform picker, which
 * is easier to hit than a bespoke list.
 *
 * The choice persists in localStorage (handled by the detector), so it survives
 * reloads and offline use.
 */
export function LanguageSwitcher(): ReactElement {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'es') as Language;

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">{t('common.language')}</span>
      <Select
        className="w-auto font-semibold"
        value={current}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {LABELS[language]}
          </option>
        ))}
      </Select>
    </label>
  );
}
