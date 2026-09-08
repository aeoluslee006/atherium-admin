import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatPriceCents } from '../../../lib/sellerConstants';
import { productImageList, shopCategoryLabel } from '../../../lib/shopCatalog';
import { supabaseRest } from '../../../lib/supabaseRest';
import ShopDetailGallery from '../../../components/ShopDetailGallery';

export const dynamic = 'force-dynamic';

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

async function loadProduct(id) {
  const selects = [
    `products?select=id,title,description,price_cents,image_url,image_urls,category,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description)&id=eq.${encodeURIComponent(id)}&is_active=eq.true&limit=1`,
    `products?select=id,title,description,price_cents,image_url,category,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description)&id=eq.${encodeURIComponent(id)}&is_active=eq.true&limit=1`,
    `products?select=id,title,description,price_cents,image_url,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact)&id=eq.${encodeURIComponent(id)}&is_active=eq.true&limit=1`,
    `products?select=id,title,description,price_cents,image_url,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type)&id=eq.${encodeURIComponent(id)}&is_active=eq.true&limit=1`,
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

  const images = productImageList(item);
  const gallery = images.length ? images : [placeholderImage(item.id)];

  return (
    <div className="container shop-detail">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <Link href="/shop" className="btn btn-outline">
          목록으로
        </Link>
      </div>

      <div className="shop-detail-grid">
        <ShopDetailGallery images={gallery} title={item.title} />
        <div className="shop-detail-info">
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
          <p className="shop-detail-desc">{item.description || '설명이 없습니다.'}</p>

          <div className="shop-contact-box">
            <div className="shop-contact-label">판매자에게 직접 연락해 거래하세요</div>
            {item.seller.contact ? (
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
          </div>
        </div>
      </div>
    </div>
  );
}
