'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import GiftShopNav from '../../../components/GiftShopNav';
import AutoTranslatedText from '../../../components/AutoTranslatedText';
import { useLocale } from '../../../components/LocaleProvider';
import { discountPercent, formatUsd, getGiftProduct, GIFT_SHOP } from '../../../lib/giftShop';
import { supabase } from '../../../lib/supabaseClient';

export default function GiftProductPage({ params }) {
  const { t, locale } = useLocale();
  const shopName = locale === 'en' ? GIFT_SHOP.nameEn : GIFT_SHOP.nameKo;
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
          if (!found) setError(t('gift.notFound'));
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
  }, [params.id, staticProduct, t]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) setEmail(data.session.user.email);
    });
  }, []);

  async function buy() {
    if (!product?.source || product.source !== 'marketplace') {
      setError(t('gift.paySoon'));
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
      if (!res.ok) throw new Error(payload.error || t('gift.payFail'));
      window.location.href = payload.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card empty-state">{t('gift.loading')}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container">
        <div className="card empty-state">{error || t('gift.none')}</div>
        <Link href="/gift" className="btn btn-outline">
          {t('gift.backHome', { name: shopName })}
        </Link>
      </div>
    );
  }

  const pct = discountPercent(product);
  const isMarket = product.source === 'marketplace';
  const displayName =
    locale === 'en' && (product.nameEn || product.name_en)
      ? product.nameEn || product.name_en
      : product.nameKo || product.name_ko;
  const altName =
    locale === 'en'
      ? product.nameKo || product.name_ko
      : product.nameEn || product.name_en;

  return (
    <div className="gift-page">
      <div className="container gift-detail">
        <GiftShopNav />

        <div className="gift-detail-grid">
          <div className="gift-detail-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={displayName || ''} />
          </div>
          <div className="gift-detail-info">
            <p className="gift-detail-vendor">
              <AutoTranslatedText text={product.vendor || t('gift.vendorFallback')} />
            </p>
            <h1 className="gift-detail-title">{displayName}</h1>
            {altName && altName !== displayName ? (
              <p className="gift-detail-en">{altName}</p>
            ) : null}
            <p className="gift-detail-blurb">
              <AutoTranslatedText text={product.blurb} />
            </p>
            <div className="gift-detail-price">
              {pct ? <span className="gift-card-pct">{pct}%</span> : null}
              <span className="gift-detail-now">{formatUsd(product.priceUsd)}</span>
              {product.compareAtUsd ? (
                <span className="gift-card-was">{formatUsd(product.compareAtUsd)}</span>
              ) : null}
            </div>
            <div className="gift-detail-flags">
              {product.giftOnly ? <span className="gift-flag">{t('gift.giftIt')}</span> : null}
              {product.onlineOnly ? <span className="gift-flag">{t('gift.onlineOnly')}</span> : null}
              {isMarket ? (
                <span className="gift-flag">{t('gift.vendorFallback')} · 2%</span>
              ) : null}
            </div>

            {isMarket ? (
              <div className="gift-buy-box">
                <label htmlFor="buyer_email">{t('gift.buyerEmail')}</label>
                <input
                  id="buyer_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="button" className="btn" onClick={buy} disabled={busy || !email}>
                  {busy ? t('common.loading') : t('gift.buyNow')}
                </button>
              </div>
            ) : (
              <div className="gift-detail-actions">
                <button type="button" className="btn" disabled>
                  {t('gift.giftIt')}
                </button>
                <Link href="/gift" className="btn btn-outline">
                  {t('shop.backToList')}
                </Link>
              </div>
            )}

            {error ? <p className="error-text">{error}</p> : null}
            <p className="gift-detail-note">
              {isMarket ? t('gift.paySplit') : t('gift.curatedNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
