import type es from './locales/es.json';

/**
 * Types the translation keys from the Spanish catalogue, which is the source of
 * truth. A typo like t('donations.titel') then fails at compile time instead of
 * rendering the raw key on screen.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof es;
    };
  }
}
