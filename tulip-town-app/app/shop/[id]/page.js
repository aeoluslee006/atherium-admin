import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

export async function generateMetadata({ params }) {
  try {
    const rows = await supabaseRest(
      `sponsors?select=business_name,description&id=eq.${encodeURIComponent(params.id)}&listing_type=eq.shop&limit=1`
    );
    const item = Array.isArray(rows) ? rows[0] : null;
    if (!item) return { title: '튤립가게' };
    return {
      title: `${item.business_name} · 튤립가게`,
      description: item.description || '튤립가게 상품',
    };
  } catch {
    return { title: '튤립가게' };
  }
}

export default async function ShopDetailPage({ params }) {
  let item = null;
  try {
    const rows = await supabaseRest(
      `sponsors?select=*&id=eq.${encodeURIComponent(params.id)}&listing_type=eq.shop&status=eq.approved&limit=1`
    );
    item = Array.isArray(rows) ? rows[0] : null;
  } catch {
    item = null;
  }
  if (!item) notFound();

  const trialActive =
    item.trial_ends_at && new Date(item.trial_ends_at).getTime() > Date.now();

  return (
    <div className="container shop-detail">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <Link href="/shop" className="btn btn-outline">
          튤립가게 목록
        </Link>
        <Link href="/shop/new" className="btn">
          물건 올리기
        </Link>
      </div>

      <div className="shop-detail-grid">
        <div className="shop-detail-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url || placeholderImage(item.id)} alt={item.business_name} />
        </div>
        <div className="shop-detail-info">
          {item.price_text ? <div className="shop-detail-price">{item.price_text}</div> : null}
          <h1 className="shop-detail-title">{item.business_name}</h1>
          <div className="shop-detail-meta">
            {[item.city, item.category].filter(Boolean).join(' · ') || 'West Michigan'}
            {trialActive ? ' · 신규 입점' : ''}
          </div>
          <p className="shop-detail-desc">{item.description || '설명이 없습니다.'}</p>

          <div className="shop-contact-box">
            <div className="shop-contact-label">구매 문의</div>
            <div className="shop-contact-value">{item.contact || '문의처가 등록되지 않았습니다.'}</div>
            <p className="hint-text" style={{ marginTop: 8 }}>
              앱에서 결제하지 않습니다. 판매자에게 직접 연락해 거래하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
