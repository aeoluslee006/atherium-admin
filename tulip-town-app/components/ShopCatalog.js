'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPriceCents } from '../lib/sellerConstants';
import {
  SHOP_CATEGORIES,
  SHOP_CITY_FILTERS,
  SHOP_SHIPPING_FILTERS,
  SHOP_SORTS,
  filterShopItems,
  isNewShopProduct,
  isPopularShopProduct,
  presentShopCategories,
  productImageList,
  shopCategoryLabel,
  shopShippingLabel,
} from '../lib/shopCatalog';
import ProductFavoriteButton from './ProductFavoriteButton';
import ShopPromoGrid from './ShopPromoGrid';

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

const CATEGORY_ICONS = {
  all: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h7a1 1 0 0 1 1 1v5H3V6a1 1 0 0 1 1-1zm9 0h7a1 1 0 0 1 1 1v5h-9V6a1 1 0 0 1 1-1zM3 13h9v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5zm11 0h9v5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-5z"
      />
    </svg>
  ),
  food: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 2h2v7a3 3 0 0 1-3 3v8H4v-8a3 3 0 0 1-3-3V2h2v7h1V2zm9.5 0c2.5 0 4.5 2.2 4.5 5v15h-2V14h-5v8h-2V7c0-2.8 2-5 4.5-5zm0 2C15.1 4 14 5.1 14 7v5h5V7c0-1.9-1.1-3-2.5-3z"
      />
    </svg>
  ),
  fashion: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2 8.5 5.5 4 4l1 6.5L2 14l4 1v7h12v-7l4-1-3-3.5L20 4l-4.5 1.5L12 2zm0 3.2 2 1.8.8-.3.7 4.2 1.7 1.5-1.5.4V20H9v-7.2l-1.5-.4 1.7-1.5.7-4.2.8.3 2-1.8z"
      />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3 3 10.2V21h6v-6h6v6h6V10.2L12 3zm0 2.4 7 5.5V19h-2v-6H7v6H5v-8.1l7-5.5z"
      />
    </svg>
  ),
  beauty: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2c1.7 0 3 1.4 3 3.2 0 1.3-.7 2.4-1.7 3l.4 1.3H16l1 2h-2.2l.5 1.5A5.5 5.5 0 0 1 12 22a5.5 5.5 0 0 1-3.7-9.5L8.8 11H6.5l1-2h2.3l.4-1.3C9.2 7.6 8.5 6.5 8.5 5.2 8.5 3.4 9.8 2 11.5 2H12zm0 2h-.5c-.6 0-1 .5-1 1.2S11 6.4 11.5 6.4h1c.6 0 1-.5 1-1.2S13.1 4 12.5 4H12zm0 8.2A3.5 3.5 0 0 0 8.5 15.7 3.5 3.5 0 0 0 12 19.2a3.5 3.5 0 0 0 3.5-3.5A3.5 3.5 0 0 0 12 12.2z"
      />
    </svg>
  ),
  kids: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a4 4 0 0 1 4 4v1.1A5 5 0 0 1 17 18H7a5 5 0 0 1 1-9.9V7a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v1.1c.6-.1 1.3-.1 2-.1s1.4 0 2 .1V7a2 2 0 0 0-2-2zM9 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
      />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2 3 7v10l9 5 9-5V7l-9-5zm0 2.2 6.5 3.6L12 11.5 5.5 7.8 12 4.2zM5 9.5l6 3.3v6.9l-6-3.3V9.5zm8 10.2v-6.9l6-3.3v6.9l-6 3.3z"
      />
    </svg>
  ),
  new: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2 13.8 8.2 20 9l-4.5 4.1L16.9 20 12 16.8 7.1 20l1.4-6.9L4 9l6.2-.8L12 2z"
      />
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 7h-2.2A3 3 0 0 0 12 4a3 3 0 0 0-5.8 3H4a1 1 0 0 0-1 1v3h18V8a1 1 0 0 0-1-1zM9 6a1 1 0 1 1 0 2H8a1 1 0 0 1 1-2zm7 0a1 1 0 0 1 0 2h-1a1 1 0 1 1 0-2h1zM3 13v7a1 1 0 0 0 1 1h7v-8H3zm10 0v8h7a1 1 0 0 0 1-1v-7h-8z"
      />
    </svg>
  ),
  local: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
      />
    </svg>
  ),
  nationwide: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 7h13l1.2 2H21v2h-1l-1.5 7H6.8L4.2 9H3V7zm4.2 9h8.9l1.1-5H7.7l-.5 5zM8 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
      />
    </svg>
  ),
};

const SHORT_CATEGORY_LABELS = {
  food: '식품',
  fashion: '패션',
  home: '생활',
  beauty: '뷰티',
  kids: '키즈',
  other: '기타',
};


function ProductCard({
  item,
  showSellerLink,
  favSet,
  setFavSet,
  compact = false,
}) {
  const seller = item.sponsor || item.sponsors;
  const thumb = productImageList(item)[0] || placeholderImage(item.id);
  const isSold = item.is_active === false;
  const isNew = !isSold && isNewShopProduct(item);
  const isPopular = !isSold && isPopularShopProduct(item);

  return (
    <article className={`shop-card${isSold ? ' is-sold' : ''}${compact ? ' shop-card--rail' : ''}`}>
      <div className="shop-card-media-wrap">
        <Link href={`/shop/${item.id}`} className="shop-card-media-link">
          <div className="shop-card-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" loading="lazy" />
          </div>
          {isSold ? <span className="shop-card-sold-badge">판매완료</span> : null}
          {!isSold && (isNew || isPopular) ? (
            <div className="shop-card-badges" aria-hidden="true">
              {isNew ? <span className="shop-card-badge shop-card-badge--new">NEW</span> : null}
              {isPopular ? <span className="shop-card-badge shop-card-badge--hot">인기</span> : null}
            </div>
          ) : null}
        </Link>
        <ProductFavoriteButton
          productId={item.id}
          initialFavorited={favSet.has(item.id)}
          className="shop-fav-btn--card"
          onChange={(next) => {
            setFavSet((prev) => {
              const copy = new Set(prev);
              if (next) copy.add(item.id);
              else copy.delete(item.id);
              return copy;
            });
          }}
        />
      </div>
      <div className="shop-card-body">
        <div className="shop-card-price">{formatPriceCents(item.price_cents)}</div>
        <Link href={`/shop/${item.id}`} className="shop-card-title">
          {item.title}
        </Link>
        {!compact ? (
          <div className="shop-card-meta shop-card-meta--row">
            {showSellerLink && seller?.id && seller?.business_name ? (
              <Link href={`/shop/seller/${seller.id}`} className="shop-card-seller">
                {seller.business_name}
              </Link>
            ) : (
              <span>{seller?.business_name || (showSellerLink ? '판매자' : '')}</span>
            )}
            {seller?.city || item.shipping_scope ? (
              <span className="shop-card-shipping">
                {[seller?.city, shopShippingLabel(item.shipping_scope)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function ShopCatalog({
  items = [],
  sectionTitle = '상품',
  showSellerLink = true,
  showToolbar = true,
  showBrandHeader = false,
  favoriteIds = [],
}) {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');
  const [shipping, setShipping] = useState('all');
  const [city, setCity] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeShortcut, setActiveShortcut] = useState('all');
  const [favSet, setFavSet] = useState(() => new Set(favoriteIds));
  const filterRef = useRef(null);
  const categoryRef = useRef(null);
  const sortRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const productsRef = useRef(null);

  const filtered = useMemo(
    () => filterShopItems(items, { category, sort, q, shipping, city }),
    [items, category, sort, q, shipping, city]
  );

  const newestItems = useMemo(
    () => filterShopItems(items, { category: 'all', sort: 'newest' }).slice(0, 8),
    [items]
  );

  const browsingHome =
    showBrandHeader &&
    category === 'all' &&
    !q.trim() &&
    shipping === 'all' &&
    city === 'all';

  const liveCategories = useMemo(() => presentShopCategories(items), [items]);
  const showCategoryStrip = liveCategories.length >= 3;
  const categoryShortcuts = useMemo(() => {
    if (!showCategoryStrip) return [];
    return [
      { id: 'all', label: '전체', category: 'all' },
      { id: 'new', label: '신상', category: 'all', emphasize: true },
      ...liveCategories.map((c) => ({
        id: c.id,
        label: SHORT_CATEGORY_LABELS[c.id] || c.label,
        category: c.id,
      })),
    ];
  }, [liveCategories, showCategoryStrip]);

  const showNewestRail = browsingHome && newestItems.length >= 3 && items.length >= 4;

  const extraFilterCount = (shipping !== 'all' ? 1 : 0) + (city !== 'all' ? 1 : 0);
  const categoryActive = category !== 'all';
  const categoryLabel =
    SHOP_CATEGORIES.find((c) => c.id === category)?.label || '카테고리';

  useEffect(() => {
    if (!filterOpen && !categoryOpen && !sortOpen && !searchOpen) return undefined;
    const onPointerDown = (event) => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
      if (categoryOpen && categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryOpen(false);
      }
      if (sortOpen && sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
      if (searchOpen && searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFilterOpen(false);
        setCategoryOpen(false);
        setSortOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [filterOpen, categoryOpen, sortOpen, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  function scrollToProducts() {
    window.requestAnimationFrame(() => {
      productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function selectCategory(nextId) {
    setCategory(nextId);
    setShipping('all');
    setActiveShortcut(nextId === 'all' ? 'all' : nextId);
    setCategoryOpen(false);
    scrollToProducts();
  }

  function selectShortcut(shortcut) {
    setActiveShortcut(shortcut.id);
    setCategory(shortcut.category || shortcut.id || 'all');
    setShipping('all');
    if (shortcut.id === 'new' || shortcut.emphasize) setSort('newest');
    setCategoryOpen(false);
    scrollToProducts();
  }

  return (
    <div className={`shop-catalog${showBrandHeader ? ' shop-catalog--home' : ''}`}>
      {showToolbar ? (
        <div className="shop-topbar">
          <div className="shop-brand-row">
            {showBrandHeader ? (
              <div className="shop-brand-inline" aria-label="튤립가게">
                <p className="shop-kicker">Tulip Town Marketplace</p>
                <h1 className="shop-brand">튤립가게</h1>
              </div>
            ) : (
              <div className="shop-section-head shop-section-head--inline">
                <h2 className="shop-section-title">{sectionTitle}</h2>
              </div>
            )}

            <div className="shop-brand-actions">
              <div className="shop-toolbar-search" ref={searchRef}>
                <button
                  type="button"
                  className={`shop-icon-trigger${searchOpen || q ? ' is-active' : ''}`}
                  aria-expanded={searchOpen}
                  aria-haspopup="dialog"
                  aria-label="검색"
                  title="검색"
                  onClick={() => {
                    setSearchOpen((open) => !open);
                    setCategoryOpen(false);
                    setSortOpen(false);
                    setFilterOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M10.5 3a7.5 7.5 0 0 1 5.95 12.1l4.22 4.23-1.41 1.41-4.23-4.22A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"
                    />
                  </svg>
                  {q ? <span className="shop-filter-badge">1</span> : null}
                </button>
                {searchOpen ? (
                  <div
                    className="shop-filter-popover shop-search-popover"
                    role="dialog"
                    aria-label="상품 검색"
                  >
                    <label className="shop-toolbar-field">
                      <span className="shop-toolbar-label">검색</span>
                      <input
                        ref={searchInputRef}
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="상품명 · 판매자"
                        aria-label="상품 검색"
                      />
                    </label>
                    {q ? (
                      <button
                        type="button"
                        className="shop-filter-clear"
                        onClick={() => setQ('')}
                      >
                        지우기
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="shop-toolbar-category" ref={categoryRef}>
                <button
                  type="button"
                  className={`shop-icon-trigger${categoryActive ? ' is-active' : ''}`}
                  aria-expanded={categoryOpen}
                  aria-haspopup="dialog"
                  aria-label={categoryActive ? `카테고리: ${categoryLabel}` : '카테고리'}
                  title={categoryLabel}
                  onClick={() => {
                    setCategoryOpen((open) => !open);
                    setFilterOpen(false);
                    setSortOpen(false);
                    setSearchOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M4 5h7a1 1 0 0 1 1 1v5H3V6a1 1 0 0 1 1-1zm9 0h7a1 1 0 0 1 1 1v5h-9V6a1 1 0 0 1 1-1zM3 13h9v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5zm11 0h9v5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-5z"
                    />
                  </svg>
                  {categoryActive ? <span className="shop-filter-badge">1</span> : null}
                </button>
                {categoryOpen ? (
                  <div
                    className="shop-filter-popover shop-category-popover"
                    role="dialog"
                    aria-label="카테고리"
                  >
                    <div className="shop-category-options" role="listbox" aria-label="카테고리 선택">
                      {SHOP_CATEGORIES.map((c) => {
                        const selected = category === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`shop-category-option${selected ? ' is-selected' : ''}`}
                            onClick={() => selectCategory(c.id)}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="shop-toolbar-sort" ref={sortRef}>
                <button
                  type="button"
                  className={`shop-icon-trigger${sort !== 'newest' ? ' is-active' : ''}`}
                  aria-expanded={sortOpen}
                  aria-haspopup="dialog"
                  aria-label={`정렬: ${SHOP_SORTS.find((s) => s.id === sort)?.label || '정렬'}`}
                  title={SHOP_SORTS.find((s) => s.id === sort)?.label || '정렬'}
                  onClick={() => {
                    setSortOpen((open) => !open);
                    setCategoryOpen(false);
                    setFilterOpen(false);
                    setSearchOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M7 4h2v12.2l2.6-2.6 1.4 1.4L8 20l-5-5 1.4-1.4L7 16.2V4zm8 16h2V7.8l2.6 2.6 1.4-1.4L17 4l-5 5 1.4 1.4L15 7.8V20z"
                    />
                  </svg>
                </button>
                {sortOpen ? (
                  <div className="shop-filter-popover shop-sort-popover" role="dialog" aria-label="정렬">
                    <div className="shop-category-options" role="listbox" aria-label="정렬 선택">
                      {SHOP_SORTS.map((s) => {
                        const selected = sort === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`shop-category-option${selected ? ' is-selected' : ''}`}
                            onClick={() => {
                              setSort(s.id);
                              setSortOpen(false);
                            }}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="shop-toolbar-filter" ref={filterRef}>
                <button
                  type="button"
                  className={`shop-icon-trigger${extraFilterCount ? ' is-active' : ''}`}
                  aria-expanded={filterOpen}
                  aria-haspopup="dialog"
                  aria-label="필터"
                  title="필터"
                  onClick={() => {
                    setFilterOpen((open) => !open);
                    setCategoryOpen(false);
                    setSortOpen(false);
                    setSearchOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M4 5h16l-6 7.2V19l-4 2v-8.8L4 5z"
                    />
                  </svg>
                  {extraFilterCount ? (
                    <span className="shop-filter-badge">{extraFilterCount}</span>
                  ) : null}
                </button>
                {filterOpen ? (
                  <div className="shop-filter-popover" role="dialog" aria-label="추가 필터">
                    <label className="shop-toolbar-field">
                      <span className="shop-toolbar-label">배송범위</span>
                      <select
                        value={shipping}
                        onChange={(e) => setShipping(e.target.value)}
                        aria-label="배송범위"
                      >
                        {SHOP_SHIPPING_FILTERS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="shop-toolbar-field">
                      <span className="shop-toolbar-label">지역</span>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        aria-label="지역"
                      >
                        {SHOP_CITY_FILTERS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {extraFilterCount ? (
                      <button
                        type="button"
                        className="shop-filter-clear"
                        onClick={() => {
                          setShipping('all');
                          setCity('all');
                        }}
                      >
                        초기화
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <p className="shop-toolbar-count" aria-live="polite">
                상품 {filtered.length}개
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="shop-section-head">
          <h2 className="shop-section-title">{sectionTitle}</h2>
          <p className="shop-section-desc">상품 {filtered.length}개</p>
        </div>
      )}

      {showBrandHeader ? (
        <>
          <p className="shop-trust-line">
            등록된 판매자의 상품입니다. 판매자에게 직접 연락해 거래하세요.
          </p>

          {showCategoryStrip ? (
            <nav className="shop-cat-rail shop-cat-rail--dense" aria-label="카테고리 바로가기">
              {categoryShortcuts.map((c) => {
                const selected = activeShortcut === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`shop-cat-chip${selected ? ' is-selected' : ''}${c.emphasize ? ' is-hot' : ''}`}
                    aria-pressed={selected}
                    onClick={() => selectShortcut(c)}
                  >
                    <span className="shop-cat-chip-icon">
                      {CATEGORY_ICONS[c.id] || CATEGORY_ICONS[c.category] || CATEGORY_ICONS.other}
                      {c.emphasize ? <span className="shop-cat-chip-badge">N</span> : null}
                    </span>
                    <span className="shop-cat-chip-label">{c.label}</span>
                  </button>
                );
              })}
            </nav>
          ) : null}

          <ShopPromoGrid items={items} onSelectCategory={selectCategory} />

          {showNewestRail ? (
            <section className="shop-rail-section" aria-labelledby="shop-newest-heading">
              <div className="shop-section-head">
                <h2 id="shop-newest-heading" className="shop-section-title">
                  새로 들어왔어요
                </h2>
                <p className="shop-section-desc">최신 등록</p>
              </div>
              <div className="shop-rail">
                {newestItems.map((item) => (
                  <ProductCard
                    key={`new-${item.id}`}
                    item={item}
                    showSellerLink={showSellerLink}
                    favSet={favSet}
                    setFavSet={setFavSet}
                    compact
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <div ref={productsRef} id="shop-products" className="shop-products-anchor">
        {showBrandHeader ? (
          <div className="shop-section-head">
            <h2 className="shop-section-title">
              {categoryActive ? categoryLabel : '전체 상품'}
            </h2>
            <p className="shop-section-desc">상품 {filtered.length}개</p>
          </div>
        ) : null}

        {filtered.length ? (
          <div className="shop-grid">
            {filtered.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                showSellerLink={showSellerLink}
                favSet={favSet}
                setFavSet={setFavSet}
              />
            ))}
          </div>
        ) : (
          <div className="card empty-state shop-empty">
            {items.length ? (
              <p>검색 조건에 맞는 상품이 없습니다.</p>
            ) : (
              <>
                <p>아직 등록된 상품이 없습니다.</p>
                {showSellerLink ? (
                  <p className="hint-text" style={{ marginTop: 10 }}>
                    판매자이신가요?{' '}
                    <Link href="/mypage/shop" className="shop-seller-link">
                      마이페이지에서 입점하기
                    </Link>
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
