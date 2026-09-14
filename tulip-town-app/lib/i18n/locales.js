export const LOCALES = ['ko', 'en'];
export const DEFAULT_LOCALE = 'ko';
export const LOCALE_COOKIE = 'tt_locale';

export function normalizeLocale(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('ko')) return 'ko';
  return DEFAULT_LOCALE;
}

export function localeLabel(locale) {
  return normalizeLocale(locale) === 'en' ? 'English' : '한국어';
}
