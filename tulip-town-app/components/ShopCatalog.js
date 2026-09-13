'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

export default function ShopCatalog({
  items = [],
  sectionTitle = '상품',
  showSellerLink = true,
  showToolbar = true,
}) {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');
  const [shipping, setShipping] = useState('all');
  const [city, setCity] = useState('all');

  const filtered = useMemo(
    () => filterShopItems(items, { category, sort, q, shipping, city }),
    [items, category, sort, q, shipping, city]
  );

  return (
    <div className="shop-catalog">
      {showToolbar ? (
        <div className="shop-toolbar" role="search">
          <label className="shop-toolbar-field">
            <span className="shop-toolbar-label">검색</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상품명 · 판매자"
              aria-label="상품 검색"
            />
          </label>
          <label className="shop-toolbar-field">
            <span className="shop-toolbar-label">카테고리</span>
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
          <label className="shop-toolbar-field">
            <span className="shop-toolbar-label">정렬</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
              {SHOP_SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="shop-section-head">
        <h2 className="shop-section-title">{sectionTitle}</h2>
        <p className="shop-section-desc">{filtered.length}개</p>
      </div>

      {filtered.length ? (
        <div className="shop-grid">
          {filtered.map((item) => {
            const seller = item.sponsor || item.sponsors;
            const thumb = productImageList(item)[0] || placeholderImage(item.id);
            return (
              <article key={item.id} className="shop-card">
                <Link href={`/shop/${item.id}`} className="shop-card-media-link">
                  <div className="shop-card-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb} alt="" loading="lazy" />
                  </div>
                </Link>
                <div className="shop-card-body">
                  <Link href={`/shop/${item.id}`} className="shop-card-title">
                    {item.title}
                  </Link>
                  {showSellerLink && seller?.id && seller?.business_name ? (
                    <Link
                      href={`/shop/seller/${seller.id}`}
                      className="shop-card-meta shop-card-seller"
                    >
                      {seller.business_name}
                    </Link>
                  ) : seller?.business_name ? (
                    <div className="shop-card-meta">{seller.business_name}</div>
                  ) : showSellerLink ? (
                    <div className="shop-card-meta">판매자</div>
                  ) : null}
                  <div className="shop-card-meta shop-card-shipping">
                    {shopShippingLabel(item.shipping_scope)}
                    {seller?.city ? ` · ${seller.city}` : ''}
                  </div>
                  <div className="shop-card-price">{formatPriceCents(item.price_cents)}</div>
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
