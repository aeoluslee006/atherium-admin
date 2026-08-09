import Link from 'next/link';
import { discountPercent, formatUsd } from '../lib/giftShop';

export default function GiftProductCard({ product, rank }) {
  const pct = discountPercent(product);

  return (
    <article className="gift-card">
      <Link href={`/gift/${product.id}`} className="gift-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt="" loading="lazy" />
        {typeof rank === 'number' ? <span className="gift-card-rank">{rank}</span> : null}
        {product.badge ? <span className="gift-card-badge">{product.badge}</span> : null}
      </Link>
      <div className="gift-card-body">
        <div className="gift-card-vendor">{product.vendor}</div>
        <Link href={`/gift/${product.id}`} className="gift-card-title">
          {product.nameKo}
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
            {product.onlineOnly ? '바로 구매' : '선물하기'}
          </Link>
        </div>
      </div>
    </article>
  );
}
