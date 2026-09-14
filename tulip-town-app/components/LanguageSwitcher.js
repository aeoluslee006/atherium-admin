'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from './LocaleProvider';

export default function LanguageSwitcher({ className = '' }) {
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();

  async function choose(next) {
    if (next === locale) return;
    setLocale(next);
    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // cookie already set client-side
    }
    router.refresh();
  }

  return (
    <div className={`lang-switcher ${className}`.trim()} role="group" aria-label={t('lang.switch')}>
      <button
        type="button"
        className={`lang-switcher-btn${locale === 'ko' ? ' is-active' : ''}`}
        aria-pressed={locale === 'ko'}
        onClick={() => choose('ko')}
      >
        KO
      </button>
      <button
        type="button"
        className={`lang-switcher-btn${locale === 'en' ? ' is-active' : ''}`}
        aria-pressed={locale === 'en'}
        onClick={() => choose('en')}
      >
        EN
      </button>
    </div>
  );
}
