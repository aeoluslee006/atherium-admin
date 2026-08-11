import Link from 'next/link';
import { formatPriceCents } from '../../lib/sellerConstants';
import { supabaseRest } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '튤립가게 · Tulip Town',
  description: '승인된 사업자 판매자의 상품을 둘러보세요',
};

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

export default async function ShopPage() {
  let items = [];
  try {
    items = await supabaseRest(
      'products?select=id,title,description,price_cents,image_url,created_at,sponsor:sponsors!inner(id,business_name,city,status,listing_type)&is_active=eq.true&sponsors.status=eq.approved&sponsors.listing_type=eq.shop&order=created_at.desc'
    );
  } catch {
    // Fallback if embed filter syntax differs
    try {
      items = await supabaseRest(
        'products?select=id,title,description,price_cents,image_url,created_at,sponsor_id,sponsors(id,business_name,city,status,listing_type)&is_active=eq.true&order=created_at.desc'
      );
      if (Array.isArray(items)) {
        items = items.filter(
          (p) => p.sponsors?.status === 'approved' && p.sponsors?.listing_type === 'shop'
        );
      }
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) items = [];

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <div className="container shop-hero-inner">
          <p className="shop-kicker">Tulip Town Marketplace</p>
          <h1 className="shop-brand">튤립가게</h1>
          <p className="shop-lead">
            승인된 사업자 판매자의 상품입니다. 판매자에게 직접 연락해 거래하세요.
          </p>
          <div className="shop-hero-cta">
            <Link href="/shop/new" className="btn">
              상품 등록
            </Link>
            <Link href="/seller/apply" className="btn btn-outline shop-hero-secondary">
              사업자 입점
            </Link>
          </div>
          <p className="shop-pricing-note">
            기본 월 $10 · 상품 6개 · 확장 +$20(최대 30개) · 최초 3개월 무료 안내 유지
          </p>
        </div>
      </section>

      <div className="container" id="shop-grid">
        <div className="shop-section-head">
          <h2 className="shop-section-title">지금 올라온 상품</h2>
          <p className="shop-section-desc">사진 · 상품명 · 가격 · 판매자</p>
        </div>

        {items.length ? (
          <div className="shop-grid">
            {items.map((item) => {
              const seller = item.sponsor || item.sponsors;
              return (
                <article key={item.id} className="shop-card">
                  <Link href={`/shop/${item.id}`} className="shop-card-media-link">
                    <div className="shop-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image_url || placeholderImage(item.id)}
                        alt=""
                        loading="lazy"
                      />
                    </div>
                  </Link>
                  <div className="shop-card-body">
                    <div className="shop-card-price">{formatPriceCents(item.price_cents)}</div>
                    <Link href={`/shop/${item.id}`} className="shop-card-title">
                      {item.title}
                    </Link>
                    {seller?.id ? (
                      <Link href={`/shop/seller/${seller.id}`} className="shop-card-seller">
                        {seller.business_name}
                        {seller.city ? ` · ${seller.city}` : ''}
                      </Link>
                    ) : (
                      <div className="shop-card-meta">판매자</div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card empty-state">
            아직 등록된 상품이 없습니다.
            <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link href="/seller/apply" className="btn btn-outline">
                입점 신청
              </Link>
              <Link href="/shop/new" className="btn">
                상품 등록
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
