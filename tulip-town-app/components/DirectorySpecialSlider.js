'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getDirectoryCategoryLabel } from '../lib/directoryCategories';
import {
  SPECIAL_AD_INTERVAL_MS,
  shuffleArray,
} from '../lib/directorySpecialAds';
import AutoTranslatedText from './AutoTranslatedText';
import { useLocale } from './LocaleProvider';

export default function DirectorySpecialSlider({ ads: initialAds = [] }) {
  const { t } = useLocale();
  const shuffled = useMemo(() => shuffleArray(initialAds || []), [initialAds]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [shuffled]);

  useEffect(() => {
    if (shuffled.length <= 1 || paused) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % shuffled.length);
    }, SPECIAL_AD_INTERVAL_MS);
    return () => clearInterval(id);
  }, [shuffled, paused]);

  if (!shuffled.length) return null;

  const current = shuffled[index] || shuffled[0];
  const image = current.special_image_url || current.ad_image_url || '';
  const page = current.directory_slots?.page_number;
  const label = current.directory_slots?.position_label;
  const catKey = current.category_slug ? `directory.cat.${current.category_slug}` : '';
  const catLabel = catKey && t(catKey) !== catKey ? t(catKey) : getDirectoryCategoryLabel(current.category_slug);

  return (
    <section
      className="dir-special-slider"
      aria-label={t('directory.specialAria')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="dir-special-slider-head">
        <h2 className="dir-special-slider-title">{t('directory.specialTitle')}</h2>
        <span className="dir-special-slider-meta">
          {t('directory.specialMeta', { current: index + 1, total: shuffled.length })}
          {paused ? t('directory.specialPaused') : ''}
        </span>
      </div>
      <div className="dir-special-slide">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="dir-special-slide-image" src={image} alt="" />
        ) : (
          <div className="dir-special-slide-image dir-special-slide-image--empty" />
        )}
        <div className="dir-special-slide-body">
          <strong className="dir-special-slide-name">
            {current.ad_title ? (
              <AutoTranslatedText text={current.ad_title} />
            ) : (
              t('directory.adFallback')
            )}
          </strong>
          <span className="dir-special-slide-cat">
            {catLabel}
            {page != null
              ? ` · ${t('directory.pageN', { n: page })}${label ? ` ${label}` : ''}`.trimEnd()
              : ''}
          </span>
          {current.ad_phone ? (
            <a className="dir-special-slide-phone" href={`tel:${current.ad_phone}`}>
              {current.ad_phone}
            </a>
          ) : null}
          {page != null ? (
            <Link href={`/directory?page=${page}`} className="dir-special-slide-link">
              {t('directory.viewOnPage')}
            </Link>
          ) : null}
        </div>
      </div>
      {shuffled.length > 1 ? (
        <div className="dir-special-dots" role="tablist" aria-label={t('directory.specialSelect')}>
          {shuffled.map((ad, i) => (
            <button
              key={ad.id || i}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`dir-special-dot${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
