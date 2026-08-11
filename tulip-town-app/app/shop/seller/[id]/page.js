import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatPriceCents } from '../../../../lib/sellerConstants';
import { supabaseRest } from '../../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

async function loadSeller(id) {
  try {
    const rows = await supabaseRest(
      `sponsors?select=id,business_name,city,description,status,listing_type&id=eq.${encodeURIComponent(id)}&listing_type=eq.shop&status=eq.approved&limit=1`
    );
    return Array.isArray(rows) ? rows[0] : null;
  } catch {
    return null;
  }
}

async function loadProducts(sponsorId) {
  try {
    const rows = await supabaseRest(
      `products?select=id,title,price_cents,image_url,created_at&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const seller = await loadSeller(params.id);
  if (!seller) return { title: '판매자 · 튤립가게' };
  return {
    title: `${seller.business_name} · 튤립가게`,
    description: seller.description || `${seller.business_name} 상품`,
  };
}

export default async function ShopSellerPage({ params }) {
  const seller = await loadSeller(params.id);
  if (!seller) notFound();
  const products = await loadProducts(seller.id);

  return (
    <div className="shop-page">
      <div className="container" style={{ paddingTop: 28, paddingBottom: 12 }}>
        <Link href="/shop" className="btn btn-outline">
          튤립가게
        </Link>
        <header className="shop-seller-head">
          <h1 className="shop-brand" style={{ fontSize: '1.75rem' }}>
            {seller.business_name}
          </h1>
          <p className="shop-lead" style={{ marginTop: 6 }}>
            {seller.city || 'West Michigan'}
          </p>
          {seller.description ? (
            <p className="hint-text" style={{ marginTop: 10, maxWidth: 640 }}>
              {seller.description}
            </p>
          ) : null}
        </header>
      </div>

      <div className="container" id="shop-grid">
        <div className="shop-section-head">
          <h2 className="shop-section-title">판매 상품</h2>
          <p className="shop-section-desc">{products.length}개</p>
        </div>

        {products.length ? (
          <div className="shop-grid">
            {products.map((item) => (
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
                  <div className="shop-card-price">{formatPriceCents(item.price_cents)}</div>
                  <div className="shop-card-title">{item.title}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card empty-state">아직 등록된 상품이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
