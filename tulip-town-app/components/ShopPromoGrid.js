'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { productImageList, shopCategoryLabel } from '../lib/shopCatalog';

const PAGE_SIZE = 4;
const MIN_PRODUCTS_PER_PROMO = 3;

const TONES = ['mint', 'sand', 'clay', 'rose', 'sky', 'leaf'];

/**
 * Build promo panels only from real inventory.
 * A category becomes a panel only when it has >= MIN_PRODUCTS_PER_PROMO products.
 * Images come from those products (never stock placeholders).
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
      kicker: shopCategoryLabel(category),
      title: `${shopCategoryLabel(category)} 모음`,
      image: hero,
      count: rows.length,
      thumbs,
    });
    toneIndex += 1;
  }

  return panels;
}

export default function ShopPromoGrid({ items = [], onSelectCategory }) {
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
      aria-label="추천 기획전"
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
              {pagePanels.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  className={`shop-promo-tile shop-promo-tile--${panel.tone}`}
                  tabIndex={pageIndex === page ? 0 : -1}
                  onClick={() => onSelectCategory?.(panel.category || 'all')}
                >
                  <div className="shop-promo-tile-copy">
                    <p className="shop-promo-tile-kicker">{panel.kicker}</p>
                    <h3 className="shop-promo-tile-title">{panel.title}</h3>
                    <p className="shop-promo-tile-count">상품 {panel.count}개</p>
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
              ))}
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="shop-promo-grid-nav">
          <p className="shop-promo-grid-meta">
            기획전 {page + 1} / {pageCount} · 총 {panels.length}개
          </p>
          <div className="shop-promo-grid-dots" role="tablist" aria-label="기획전 페이지">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={`promo-dot-${i}`}
                type="button"
                role="tab"
                aria-selected={i === page}
                aria-label={`${i + 1}페이지`}
                className={`shop-promo-grid-dot${i === page ? ' is-active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <div className="shop-promo-grid-arrows">
            <button
              type="button"
              className="shop-promo-grid-arrow"
              aria-label="이전 기획전"
              onClick={() => goTo(page - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="shop-promo-grid-arrow"
              aria-label="다음 기획전"
              onClick={() => goTo(page + 1)}
            >
              ›
            </button>
          </div>
        </div>
      ) : (
        <p className="shop-promo-grid-hint">
          실제 등록 상품이 모인 카테고리만 보여 줍니다.{' '}
          <Link href="#shop-products">전체 상품 보기</Link>
        </p>
      )}
    </section>
  );
}
