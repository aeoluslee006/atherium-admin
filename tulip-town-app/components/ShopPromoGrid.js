'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { productImageList, shopCategoryLabel } from '../lib/shopCatalog';
import { useLocale } from './LocaleProvider';

const PAGE_SIZE = 4;
const MIN_PRODUCTS_PER_PROMO = 3;

const TONES = ['mint', 'sand', 'clay', 'rose', 'sky', 'leaf'];

/**
 * Build promo panels only from real inventory.
 * A category becomes a panel only when it has >= MIN_PRODUCTS_PER_PROMO products.
 * Images come from those products (never stock placeholders).
 * Titles are built at render time via t() so they stay locale-aware.
 */
export function buildPromoPanelsFromItems(items = []) {
  const pool = Array.isArray(items) ? items.filter((item) => item?.is_active !== false) : [];
  const byCategory = new Map();

  for (const item of pool) {
    const key = String(item.category || 'other');
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(item);
  }

  const panels = [];
  let toneIndex = 0;
  for (const [category, rows] of byCategory.entries()) {
    if (rows.length < MIN_PRODUCTS_PER_PROMO) continue;
    const sorted = [...rows].sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );
    const hero = productImageList(sorted[0])[0];
    if (!hero) continue;
    const thumbs = sorted.slice(0, 3).map((item) => ({
      id: item.id,
      src: productImageList(item)[0] || hero,
    }));
    panels.push({
      id: `promo-${category}`,
      category,
      tone: TONES[toneIndex % TONES.length],
      image: hero,
      count: rows.length,
      thumbs,
    });
    toneIndex += 1;
  }

  return panels;
}

export default function ShopPromoGrid({ items = [], onSelectCategory }) {
  const { t } = useLocale();
  const categoryLabelOf = (id) => {
    const key = `shop.cat.${id}`;
    const value = t(key);
    return value === key ? shopCategoryLabel(id) : value;
  };
  const panels = useMemo(() => buildPromoPanelsFromItems(items), [items]);
  const pageCount = Math.max(1, Math.ceil(panels.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < panels.length; i += PAGE_SIZE) {
      chunks.push(panels.slice(i, i + PAGE_SIZE));
    }
    return chunks;
  }, [panels]);

  useEffect(() => {
    setPage(0);
  }, [panels.length]);

  useEffect(() => {
    if (paused || pageCount < 2) return undefined;
    const timer = window.setInterval(() => {
      setPage((current) => (current + 1) % pageCount);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, pageCount]);

  if (!panels.length) return null;

  function goTo(next) {
    setPage(((next % pageCount) + pageCount) % pageCount);
  }

  return (
    <section
      className="shop-promo-grid"
      aria-label={t('shop.promo.aria')}
      aria-roledescription={pageCount > 1 ? 'carousel' : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="shop-promo-viewport">
        <div
          className="shop-promo-track"
          style={{ transform: `translate3d(-${page * 100}%, 0, 0)` }}
        >
          {pages.map((pagePanels, pageIndex) => (
            <div
              key={`promo-page-${pageIndex}`}
              className={`shop-promo-page shop-promo-page--count-${pagePanels.length}`}
              aria-hidden={pageIndex !== page}
            >
              {pagePanels.map((panel) => {
                const catLabel = categoryLabelOf(panel.category);
                return (
                  <button
                    key={panel.id}
                    type="button"
                    className={`shop-promo-tile shop-promo-tile--${panel.tone}`}
                    tabIndex={pageIndex === page ? 0 : -1}
                    onClick={() => onSelectCategory?.(panel.category || 'all')}
                  >
                    <div className="shop-promo-tile-copy">
                      <p className="shop-promo-tile-kicker">{catLabel}</p>
                      <h3 className="shop-promo-tile-title">
                        {t('shop.promo.collection', { category: catLabel })}
                      </h3>
                      <p className="shop-promo-tile-count">
                        {t('shop.productCount', { count: panel.count })}
                      </p>
                    </div>
                    <div
                      className="shop-promo-tile-hero"
                      style={{ backgroundImage: `url('${panel.image}')` }}
                      aria-hidden="true"
                    />
                    <div className="shop-promo-tile-thumbs" aria-hidden="true">
                      {panel.thumbs.map((thumb) => (
                        <span key={thumb.id} className="shop-promo-tile-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumb.src} alt="" loading="lazy" />
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="shop-promo-grid-nav">
          <p className="shop-promo-grid-meta">
            {t('shop.promo.meta', {
              page: page + 1,
              total: pageCount,
              count: panels.length,
            })}
          </p>
          <div className="shop-promo-grid-dots" role="tablist" aria-label={t('shop.promo.pages')}>
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={`promo-dot-${i}`}
                type="button"
                role="tab"
                aria-selected={i === page}
                aria-label={t('shop.promo.pageN', { n: i + 1 })}
                className={`shop-promo-grid-dot${i === page ? ' is-active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <div className="shop-promo-grid-arrows">
            <button
              type="button"
              className="shop-promo-grid-arrow"
              aria-label={t('shop.promo.prev')}
              onClick={() => goTo(page - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="shop-promo-grid-arrow"
              aria-label={t('shop.promo.next')}
              onClick={() => goTo(page + 1)}
            >
              ›
            </button>
          </div>
        </div>
      ) : (
        <p className="shop-promo-grid-hint">
          {t('shop.promo.hint')}{' '}
          <Link href="#shop-products">{t('shop.promo.viewAll')}</Link>
        </p>
      )}
    </section>
  );
}
