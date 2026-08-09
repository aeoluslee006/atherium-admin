import Link from 'next/link';
import { supabaseRest } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '튤립가게 · Tulip Town',
  description: '동네 이웃과 사고팔기 · Facebook Marketplace 스타일 입점',
};

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

export default async function ShopPage() {
  let items = [];
  try {
    items = await supabaseRest(
      'sponsors?select=id,business_name,description,category,city,image_url,contact,price_text,trial_ends_at,approved_at,created_at&listing_type=eq.shop&status=eq.approved&order=approved_at.desc.nullslast,created_at.desc'
    );
  } catch {
    items = [];
  }
  if (!Array.isArray(items)) items = [];

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <div className="container shop-hero-inner">
          <p className="shop-kicker">Tulip Town Marketplace</p>
          <h1 className="shop-brand">튤립가게</h1>
          <p className="shop-lead">
            당근·페이스북 마켓처럼 올려두고, 직접 연락해서 거래하세요. 앱 안 결제·수수료 없습니다.
          </p>
          <div className="shop-hero-cta">
            <Link href="/shop/new" className="btn">
              물건 올리기
            </Link>
            <a href="#shop-grid" className="btn btn-outline shop-hero-secondary">
              둘러보기
            </a>
          </div>
          <p className="shop-pricing-note">입점 월 $10 · 첫 3개월 무료 (관리자 승인 시)</p>
        </div>
      </section>

      <div className="container" id="shop-grid">
        <div className="shop-section-head">
          <h2 className="shop-section-title">지금 올라온 물건</h2>
          <p className="shop-section-desc">관심 있으면 문의처로 바로 연락하세요.</p>
        </div>

        {items.length ? (
          <div className="shop-grid">
            {items.map((item) => (
              <Link key={item.id} href={`/shop/${item.id}`} className="shop-card">
                <div className="shop-card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url || placeholderImage(item.id)}
                    alt=""
                    loading="lazy"
                  />
                </div>
                <div className="shop-card-body">
                  {item.price_text ? <div className="shop-card-price">{item.price_text}</div> : null}
                  <div className="shop-card-title">{item.business_name}</div>
                  <div className="shop-card-meta">
                    {[item.city, item.category].filter(Boolean).join(' · ') || 'West Michigan'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            아직 등록된 물건이 없습니다. 첫 물건을 올려보세요!
            <div style={{ marginTop: 12 }}>
              <Link href="/shop/new" className="btn">
                물건 올리기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
