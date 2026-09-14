'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from './LocaleProvider';
import { localizePostFields, postNeedsEnTranslation } from '../lib/i18n/postLocale';

/**
 * Renders post title (and optional body) for the active locale.
 * If EN is selected and translations are missing, requests auto-translation once.
 */
export default function LocalizedPostContent({
  post,
  as = 'h2',
  className = '',
  showBody = false,
  bodyClassName = '',
  htmlBody = false,
}) {
  const { locale, t } = useLocale();
  const [remote, setRemote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const merged = useMemo(() => {
    if (!post) return null;
    return {
      ...post,
      title_en: remote?.title_en || post.title_en,
      body_en: remote?.body_en || post.body_en,
      source_lang: remote?.source_lang || post.source_lang,
    };
  }, [post, remote]);

  useEffect(() => {
    if (!merged?.id || locale !== 'en') return;
    if (!postNeedsEnTranslation(merged)) return;
    let cancelled = false;
    setBusy(true);
    fetch('/api/translate/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: merged.id }),
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setRemote(payload);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, merged?.id, merged?.title_en, merged?.body_en]);

  if (!merged) return null;

  const localized = localizePostFields(merged, showOriginal ? 'ko' : locale);
  const TitleTag = as;
  const canToggle = locale === 'en' && Boolean(merged.title_en || remote?.title_en || merged.body_en);

  return (
    <div className="localized-post-content">
      <TitleTag className={className}>
        {localized.title}
      </TitleTag>
      {busy ? <p className="hint-text localized-post-status">{t('post.translating')}</p> : null}
      {!busy && localized.isTranslated && locale === 'en' ? (
        <p className="hint-text localized-post-status">{t('post.translated')}</p>
      ) : null}
      {canToggle ? (
        <button
          type="button"
          className="btn btn-outline localized-post-toggle"
          onClick={() => setShowOriginal((v) => !v)}
        >
          {showOriginal ? t('post.showTranslation') : t('post.showOriginal')}
        </button>
      ) : null}
      {showBody ? (
        htmlBody ? (
          <div
            className={bodyClassName}
            dangerouslySetInnerHTML={{ __html: localized.body || '' }}
          />
        ) : (
          <div className={bodyClassName} style={{ whiteSpace: 'pre-wrap' }}>
            {localized.body}
          </div>
        )
      ) : null}
    </div>
  );
}
