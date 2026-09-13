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
  favoriteIds = [],
}) {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');
  const [shipping, setShipping] = useState('all');
  const [city, setCity] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [favSet, setFavSet] = useState(() => new Set(favoriteIds));
  const filterRef = useRef(null);

  const filtered = useMemo(
    () => filterShopItems(items, { category, sort, q, shipping, city }),
    [items, category, sort, q, shipping, city]
  );

  const extraFilterCount = (shipping !== 'all' ? 1 : 0) + (city !== 'all' ? 1 : 0);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const onPointerDown = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [filterOpen]);

  return (
    <div className="shop-catalog">
      {showToolbar ? (
        <div className="shop-toolbar shop-toolbar--slim" role="search">
          <label className="shop-toolbar-field shop-toolbar-field--search">
            <span className="sr-only">검색</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상품명 · 판매자 검색"
              aria-label="상품 검색"
            />
          </label>
          <label className="shop-toolbar-field">
            <span className="sr-only">카테고리</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="카테고리"
            >
              {SHOP_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="shop-toolbar-field">
            <span className="sr-only">정렬</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
              {SHOP_SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div className="shop-toolbar-filter" ref={filterRef}>
            <button
              type="button"
              className={`shop-filter-trigger${extraFilterCount ? ' is-active' : ''}`}
              aria-expanded={filterOpen}
              aria-haspopup="dialog"
              onClick={() => setFilterOpen((open) => !open)}
            >
              필터
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
                  <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="지역">
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
