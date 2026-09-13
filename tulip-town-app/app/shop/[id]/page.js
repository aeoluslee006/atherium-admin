import Link from 'next/link';
import { notFound } from 'next/navigation';
import MemberTierBadge from '../../../components/MemberTierBadge';
import ProductFavoriteButton from '../../../components/ProductFavoriteButton';
import ShopDetailGallery from '../../../components/ShopDetailGallery';
import { getTierMeta } from '../../../lib/memberTier';
import { formatPriceCents } from '../../../lib/sellerConstants';
import { productImageList, shopCategoryLabel } from '../../../lib/shopCatalog';
import { loadFavoriteProductIds } from '../../../lib/shopFavorites';
import { loadSellerTrust } from '../../../lib/shopSellerTrust';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

async function loadProduct(id) {
  const selects = [
    `products?select=id,title,description,price_cents,image_url,image_urls,category,shipping_scope,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,image_urls,category,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,category,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
  ];

  for (const path of selects) {
    try {
      const rows = await supabaseRest(path);
      const item = Array.isArray(rows) ? rows[0] : null;
      if (!item) continue;
      const seller = item.sponsors;
      if (!seller || seller.status !== 'approved' || seller.listing_type !== 'shop') return null;
      return { ...item, seller };
    } catch {
      // try next select shape
    }
  }
  return null;
}

export async function generateMetadata({ params }) {
  const item = await loadProduct(params.id);
  if (!item) return { title: '튤립가게' };
  return {
    title: `${item.title} · 튤립가게`,
    description: item.description || '튤립가게 상품',
  };
}

export default async function ShopDetailPage({ params }) {
  const item = await loadProduct(params.id);
  if (!item) notFound();

  const favoriteIds = await loadFavoriteProductIds();
  const isFavorited = favoriteIds.includes(item.id);
  const isSold = item.is_active === false;

  const images = productImageList(item);
  const gallery = images.length ? images : [placeholderImage(item.id)];
  const sellerTrust = await loadSellerTrust(item.seller);
  const tierMeta = getTierMeta(sellerTrust.tier);

  return (
    <div className="container shop-detail">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <Link href="/shop" className="btn btn-outline">
          목록으로
        </Link>
        <ProductFavoriteButton
          productId={item.id}
          initialFavorited={isFavorited}
          size="lg"
          className="shop-fav-btn--detail"
        />
      </div>

      <div className="shop-detail-grid">
        <div className="shop-detail-media-wrap">
          <ShopDetailGallery images={gallery} title={item.title} />
          {isSold ? <span className="shop-card-sold-badge shop-card-sold-badge--detail">판매완료</span> : null}
        </div>
        <div>
          <div className="shop-detail-price">{formatPriceCents(item.price_cents)}</div>
          <h1 className="shop-detail-title">{item.title}</h1>
          <div className="shop-detail-meta">
            판매자:{' '}
            <Link href={`/shop/seller/${item.seller.id}`} className="shop-seller-link">
              {item.seller.business_name}
            </Link>
            {item.seller.city ? ` · ${item.seller.city}` : ''}
            {item.category ? ` · ${shopCategoryLabel(item.category)}` : ''}
          </div>

          <div className="shop-seller-trust" aria-label="판매자 등급">
            <MemberTierBadge tier={sellerTrust.tier} />
            <span className="shop-seller-trust-text">
              {tierMeta.labelKo} 등급
              {sellerTrust.tenureLabel ? ` · ${sellerTrust.tenureLabel}` : ''}
            </span>
          </div>

          <p className="shop-detail-desc">{item.description || '설명이 없습니다.'}</p>

          <div className="shop-contact-box">
            <div className="shop-contact-label">판매자에게 직접 연락해 거래하세요</div>
            {isSold ? (
              <p className="hint-text" style={{ marginTop: 8 }}>
                이 상품은 판매가 완료되었습니다.
              </p>
            ) : item.seller.contact ? (
              <div className="shop-contact-value">{item.seller.contact}</div>
            ) : (
              <p className="hint-text" style={{ marginTop: 8 }}>
                연락처는 판매자 스토어에서 확인해 주세요.
              </p>
            )}
            <Link
              href={`/shop/seller/${item.seller.id}`}
              className="btn btn-outline"
              style={{ marginTop: 12, display: 'inline-flex' }}
            >
              {item.seller.business_name} 상품 더보기
            </Link>
            <p className="hint-text" style={{ marginTop: 8 }}>
              앱에서 결제하지 않습니다. 판매자와 직접 거래하세요.
            </p>
            <p className="shop-safety-note">
              안전한 거래를 위해 공공장소에서 만나 직접 확인 후 거래하시길 권장합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
