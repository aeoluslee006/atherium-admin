'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { productImageList } from '../lib/shopCatalog';

const PAGE_SIZE = 4;

/** 12 curated panels → 3 pages × 4 equal tiles */
export const SHOP_PROMO_PANELS = [
  {
    id: 'food-fresh',
    category: 'food',
    tone: 'mint',
    kicker: '식품·음료',
    title: '식탁 위 신선한 한 상',
    image:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'fashion-pick',
    category: 'fashion',
    tone: 'sand',
    kicker: '패션·잡화',
    title: '데일리 룩 포인트',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'home-nest',
    category: 'home',
    tone: 'clay',
    kicker: '생활·인테리어',
    title: '집을 채우는 소품',
    image:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'beauty-care',
    category: 'beauty',
    tone: 'rose',
    kicker: '뷰티·헬스',
    title: '나를 위한 루틴',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'kids-joy',
    category: 'kids',
    tone: 'sky',
    kicker: '키즈·육아',
    title: '아이를 위한 선택',
    image:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'gift-box',
    category: 'all',
    tone: 'leaf',
    kicker: '선물 추천',
    title: '마음을 담은 선물',
    image:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'local-taste',
    category: 'food',
    tone: 'sand',
    kicker: '간식 픽',
    title: '동네에서 고른 간식',
    image:
      'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'home-cozy',
    category: 'home',
    tone: 'mint',
    kicker: '홈카페',
    title: '따뜻한 집 안 풍경',
    image:
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'beauty-glow',
    category: 'beauty',
    tone: 'rose',
    kicker: '스킨케어',
    title: '피부 결 케어',
    image:
      'https://images.unsplash.com/photo-1570172619604-71b627eef7c2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'fashion-bag',
    category: 'fashion',
    tone: 'clay',
    kicker: '잡화 픽',
    title: '가방·액세서리',
    image:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'kids-play',
    category: 'kids',
    tone: 'sky',
    kicker: '플레이',
    title: '장난감·놀이',
    image:
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'other-finds',
    category: 'other',
    tone: 'leaf',
    kicker: '기타 발견',
    title: '숨은 추천 상품',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
  },
];

function thumbsForPanel(items, panel, limit = 3) {
  const pool = Array.isArray(items) ? items : [];
  const matched =
    panel.category && panel.category !== 'all'
      ? pool.filter((item) => String(item.category || 'other') === panel.category)
      : pool;
  const source = matched.length ? matched : pool;
  const thumbs = source.slice(0, limit).map((item) => ({
    id: item.id,
    src: productImageList(item)[0] || panel.image,
  }));
  while (thumbs.length < limit) {
    thumbs.push({
      id: `${panel.id}-ghost-${thumbs.length}`,
      src: panel.image,
      ghost: true,
    });
  }
  return thumbs;
}

export default function ShopPromoGrid({ items = [], onSelectCategory }) {
  const pageCount = Math.ceil(SHOP_PROMO_PANELS.length / PAGE_SIZE);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < SHOP_PROMO_PANELS.length; i += PAGE_SIZE) {
      chunks.push(
        SHOP_PROMO_PANELS.slice(i, i + PAGE_SIZE).map((panel) => ({
          ...panel,
          thumbs: thumbsForPanel(items, panel),
        }))
      );
    }
    return chunks;
  }, [items]);

  useEffect(() => {
    if (paused || pageCount < 2) return undefined;
    const timer = window.setInterval(() => {
      setPage((current) => (current + 1) % pageCount);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, pageCount]);

  function goTo(next) {
    setPage(((next % pageCount) + pageCount) % pageCount);
  }

  return (
    <section
      className="shop-promo-grid"
      aria-label="추천 기획전"
      aria-roledescription="carousel"
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
              className="shop-promo-page"
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
                  </div>
                  <div
                    className="shop-promo-tile-hero"
                    style={{ backgroundImage: `url('${panel.image}')` }}
                    aria-hidden="true"
                  />
                  <div className="shop-promo-tile-thumbs" aria-hidden="true">
                    {panel.thumbs.map((thumb) => (
                      <span
                        key={thumb.id}
                        className={`shop-promo-tile-thumb${thumb.ghost ? ' is-ghost' : ''}`}
                      >
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

      <div className="shop-promo-grid-nav">
        <p className="shop-promo-grid-meta">
          기획전 {page + 1} / {pageCount} · 총 {SHOP_PROMO_PANELS.length}개
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

      <p className="shop-promo-grid-hint">
        각 카드를 누르면 관련 카테고리 상품으로 이동합니다.{' '}
        <Link href="#shop-products">전체 상품 보기</Link>
      </p>
    </section>
  );
}
