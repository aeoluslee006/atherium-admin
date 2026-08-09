import Link from 'next/link';
import { notFound } from 'next/navigation';
import GiftShopNav from '../../../components/GiftShopNav';
import {
  GIFT_PRODUCTS,
  GIFT_SHOP,
  discountPercent,
  formatUsd,
  getGiftProduct,
} from '../../../lib/giftShop';

export function generateStaticParams() {
  return GIFT_PRODUCTS.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }) {
  const product = getGiftProduct(params.id);
  if (!product) return { title: GIFT_SHOP.nameKo };
  return {
    title: `${product.nameKo} · ${GIFT_SHOP.nameKo}`,
    description: product.blurb,
  };
}

export default function GiftProductPage({ params }) {
  const product = getGiftProduct(params.id);
  if (!product) notFound();

  const pct = discountPercent(product);

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
            </div>
            <div className="gift-detail-actions">
              <button type="button" className="btn" disabled title="결제 연결 준비 중">
                {product.onlineOnly ? '바로 구매 (준비 중)' : '선물하기 (준비 중)'}
              </button>
              <Link href="/gift" className="btn btn-outline">
                목록으로
              </Link>
            </div>
            <p className="gift-detail-note">
              결제는 곧 Stripe로 연결됩니다. 지금은 상품 구성·가격을 함께 다듬는 단계예요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
