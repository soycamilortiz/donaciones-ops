import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

/**
 * Internationalisation setup.
 *
 * Both catalogues are bundled instead of lazily fetched. The app is a PWA used
 * in the field with unreliable connectivity: fetching a language file over the
 * network would leave the interface untranslated exactly when there is no
 * signal. Two small JSON files cost far less than that failure mode.
 */
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'soschoco.language';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    // Locked to Spanish for now: the field team and volunteers in Chocó work in
    // Spanish, and a device set to English must not flip the UI. `lng` overrides
    // the detector (navigator/localStorage), so a stale "en" no longer wins. To
    // re-enable detection / English, drop `lng` here and restore the
    // LanguageSwitcher in AppShell.
    lng: 'es',
    // Spanish is the product language: users are in Chocó, Colombia. English
    // exists for contributors and for anyone whose device is not in Spanish.
    fallbackLng: 'es',
    supportedLngs: SUPPORTED_LANGUAGES,
    // Treat "es-CO" and "es-419" as "es" rather than falling back to English.
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      // React already escapes anything it renders.
      escapeValue: false,
    },
  });

export default i18n;
