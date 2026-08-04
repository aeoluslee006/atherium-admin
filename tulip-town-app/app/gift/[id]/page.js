'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import GiftShopNav from '../../../components/GiftShopNav';
import { discountPercent, formatUsd, getGiftProduct, GIFT_SHOP } from '../../../lib/giftShop';
import { supabase } from '../../../lib/supabaseClient';

export default function GiftProductPage({ params }) {
  const staticProduct = getGiftProduct(params.id);
  const [product, setProduct] = useState(staticProduct);
  const [loading, setLoading] = useState(!staticProduct);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (staticProduct) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/gift/products', { cache: 'no-store' });
        const data = await res.json();
        const found = (data.products || []).find((p) => p.id === params.id);
        if (!cancelled) {
          if (!found) setError('상품을 찾을 수 없습니다.');
          else setProduct(found);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, staticProduct]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) setEmail(data.session.user.email);
    });
  }, []);

  async function buy() {
    if (!product?.source || product.source !== 'marketplace') {
      setError('이 상품은 곧 결제 연결됩니다.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (data.session?.access_token) {
        headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      const res = await fetch('/api/gift/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ product_id: product.id, email }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '결제 시작 실패');
      window.location.href = payload.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card empty-state">로딩 중…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container">
        <div className="card empty-state">{error || '상품 없음'}</div>
        <Link href="/gift" className="btn btn-outline">
          {GIFT_SHOP.nameKo}로
        </Link>
      </div>
    );
  }

  const pct = discountPercent(product);
  const isMarket = product.source === 'marketplace';

  return (
    <div className="gift-page">
      <div className="container gift-detail">
        <GiftShopNav />

        <div className="gift-detail-grid">
          <div className="gift-detail-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={product.nameKo} />
          </div>
          <div className="gift-detail-info">
            <p className="gift-detail-vendor">{product.vendor}</p>
            <h1 className="gift-detail-title">{product.nameKo}</h1>
            {product.nameEn ? <p className="gift-detail-en">{product.nameEn}</p> : null}
            <p className="gift-detail-blurb">{product.blurb}</p>
            <div className="gift-detail-price">
              {pct ? <span className="gift-card-pct">{pct}%</span> : null}
              <span className="gift-detail-now">{formatUsd(product.priceUsd)}</span>
              {product.compareAtUsd ? (
                <span className="gift-card-was">{formatUsd(product.compareAtUsd)}</span>
              ) : null}
            </div>
            <div className="gift-detail-flags">
              {product.giftOnly ? <span className="gift-flag">선물하기 가능</span> : null}
              {product.onlineOnly ? <span className="gift-flag">온라인 전용</span> : null}
              {isMarket ? <span className="gift-flag">입점 판매자 · 수수료 2%</span> : null}
            </div>

            {isMarket ? (
              <div className="gift-buy-box">
                <label htmlFor="buyer_email">받는/구매 이메일</label>
                <input
                  id="buyer_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="button" className="btn" onClick={buy} disabled={busy || !email}>
                  {busy ? '결제 준비 중…' : '구매하기'}
                </button>
              </div>
            ) : (
              <div className="gift-detail-actions">
                <button type="button" className="btn" disabled>
                  선물하기 (공식 상품 · 준비 중)
                </button>
                <Link href="/gift" className="btn btn-outline">
                  목록으로
                </Link>
              </div>
            )}

            {error ? <p className="error-text">{error}</p> : null}
            <p className="gift-detail-note">
              {isMarket
                ? '결제 시 Stripe Connect로 판매자에게 98%, 튤립가게에 2%가 자동 분배됩니다.'
                : '공식 큐레이션 상품입니다. 입점 판매 상품은 바로 결제할 수 있어요.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
