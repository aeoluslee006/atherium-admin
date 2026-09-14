import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale } from './locales';
import { translate } from './messages';

export function getServerLocale() {
  try {
    const value = cookies().get(LOCALE_COOKIE)?.value;
    return normalizeLocale(value || DEFAULT_LOCALE);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function createServerT(locale) {
  const lang = normalizeLocale(locale);
  return (key, vars) => translate(lang, key, vars);
}
