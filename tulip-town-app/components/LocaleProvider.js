'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale } from '../lib/i18n/locales';
import { translate } from '../lib/i18n/messages';

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

function readCookieLocale() {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return normalizeLocale(match ? decodeURIComponent(match[1]) : DEFAULT_LOCALE);
}

function writeCookieLocale(locale) {
  const value = normalizeLocale(locale);
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
  try {
    localStorage.setItem(LOCALE_COOKIE, value);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = value === 'en' ? 'en' : 'ko';
  }
}

export function LocaleProvider({ children, initialLocale = DEFAULT_LOCALE }) {
  const [locale, setLocaleState] = useState(() => normalizeLocale(initialLocale));

  useEffect(() => {
    const fromCookie = readCookieLocale();
    if (fromCookie !== locale) setLocaleState(fromCookie);
    document.documentElement.lang = fromCookie === 'en' ? 'en' : 'ko';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next) => {
    const value = normalizeLocale(next);
    writeCookieLocale(value);
    setLocaleState(value);
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  return useLocale().t;
}
