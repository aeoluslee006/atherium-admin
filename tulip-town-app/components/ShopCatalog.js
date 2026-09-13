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
  productImageList,
  shopShippingLabel,
} from '../lib/shopCatalog';
import ProductFavoriteButton from './ProductFavoriteButton';

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
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
  const [favSet, setFavSet] = useState(() => new Set(favoriteIds));
  const filterRef = useRef(null);
  const categoryRef = useRef(null);
  const sortRef = useRef(null);

  const filtered = useMemo(
    () => filterShopItems(items, { category, sort, q, shipping, city }),
    [items, category, sort, q, shipping, city]
  );

  const extraFilterCount = (shipping !== 'all' ? 1 : 0) + (city !== 'all' ? 1 : 0);
  const categoryActive = category !== 'all';
  const categoryLabel =
    SHOP_CATEGORIES.find((c) => c.id === category)?.label || '카테고리';

  useEffect(() => {
    if (!filterOpen && !categoryOpen && !sortOpen) return undefined;
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
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFilterOpen(false);
        setCategoryOpen(false);
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [filterOpen, categoryOpen, sortOpen]);

  return (
    <div className="shop-catalog">
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
                            onClick={() => {
                              setCategory(c.id);
                              setCategoryOpen(false);
                            }}
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
                {filtered.length}개
              </p>
            </div>
          </div>

          <label className="shop-search-bar">
            <span className="sr-only">검색</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상품명 · 판매자 검색"
              aria-label="상품 검색"
            />
          </label>

          {showBrandHeader ? (
            <p className="shop-lead shop-lead--under">
              승인된 사업자 판매자의 상품입니다. 판매자에게 직접 연락해 거래하세요.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="shop-section-head">
          <h2 className="shop-section-title">{sectionTitle}</h2>
          <p className="shop-section-desc">{filtered.length}개</p>
        </div>
      )}

      {filtered.length ? (
        <div className="shop-grid">
          {filtered.map((item) => {
            const seller = item.sponsor || item.sponsors;
            const thumb = productImageList(item)[0] || placeholderImage(item.id);
            const isSold = item.is_active === false;
            return (
              <article key={item.id} className={`shop-card${isSold ? ' is-sold' : ''}`}>
                <div className="shop-card-media-wrap">
                  <Link href={`/shop/${item.id}`} className="shop-card-media-link">
                    <div className="shop-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb} alt="" loading="lazy" />
                    </div>
                    {isSold ? <span className="shop-card-sold-badge">판매완료</span> : null}
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
                </div>
              </article>
            );
          })}
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
  );
}
