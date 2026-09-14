'use client';

import Link from 'next/link';
import { discountPercent, formatUsd } from '../lib/giftShop';
import AutoTranslatedText from './AutoTranslatedText';
import { useLocale } from './LocaleProvider';

export default function GiftProductCard({ product, rank }) {
  const { t, locale } = useLocale();
  const pct = discountPercent(product);
  const title =
    locale === 'en' && (product.nameEn || product.name_en)
      ? product.nameEn || product.name_en
      : product.nameKo || product.name_ko;

  return (
    <article className="gift-card">
      <Link href={`/gift/${product.id}`} className="gift-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt="" loading="lazy" />
        {typeof rank === 'number' ? <span className="gift-card-rank">{rank}</span> : null}
        {product.badge ? (
          <span className="gift-card-badge">
            <AutoTranslatedText text={product.badge} />
          </span>
        ) : null}
      </Link>
      <div className="gift-card-body">
        <div className="gift-card-vendor">
          <AutoTranslatedText text={product.vendor} />
        </div>
        <Link href={`/gift/${product.id}`} className="gift-card-title">
          {locale === 'en' && (product.nameEn || product.name_en) ? (
            title
          ) : (
            <AutoTranslatedText text={product.nameKo || product.name_ko || ''} />
          )}
        </Link>
        <div className="gift-card-price">
          {pct ? <span className="gift-card-pct">{pct}%</span> : null}
          <span className="gift-card-now">{formatUsd(product.priceUsd)}</span>
          {product.compareAtUsd ? (
            <span className="gift-card-was">{formatUsd(product.compareAtUsd)}</span>
          ) : null}
        </div>
        <div className="gift-card-actions">
          <Link href={`/gift/${product.id}`} className="btn gift-btn-buy">
            {product.onlineOnly ? t('gift.buyNow') : t('gift.giftIt')}
          </Link>
        </div>
      </div>
    </article>
  );
}
