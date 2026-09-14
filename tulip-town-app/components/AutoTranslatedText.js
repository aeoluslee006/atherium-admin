'use client';

import { useEffect, useState } from 'react';
import { useLocale } from './LocaleProvider';
import { containsHangul } from '../lib/i18n/detect';

const cache = new Map();

async function translateOnce(text, to) {
  const key = `${to}::${text}`;
  if (cache.has(key)) return cache.get(key);
  const pending = fetch('/api/translate/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, to }),
  })
    .then(async (res) => {
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'translate failed');
      return String(payload.text || text);
    })
    .catch(() => text);
  cache.set(key, pending);
  return pending;
}

/** Shows Korean UGC in English when locale is EN (auto-translates once). */
export default function AutoTranslatedText({
  text = '',
  as: Tag = 'span',
  className = '',
  html = false,
}) {
  const { locale } = useLocale();
  const original = String(text || '');
  const [display, setDisplay] = useState(original);

  useEffect(() => {
    let cancelled = false;
    setDisplay(original);
    if (locale !== 'en' || !original.trim() || !containsHangul(original)) {
      return undefined;
    }
    translateOnce(original, 'en').then((out) => {
      if (!cancelled) setDisplay(out);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, original]);

  if (html) {
    return <Tag className={className} dangerouslySetInnerHTML={{ __html: display }} />;
  }
  return <Tag className={className}>{display}</Tag>;
}
