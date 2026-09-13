import ShopCatalog from '../../components/ShopCatalog';
import { supabaseRest } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '튤립가게 · Tulip Town',
  description: '승인된 사업자 판매자의 상품을 둘러보세요',
};

async function loadShopProducts() {
  const selects = [
    'products?select=id,title,description,price_cents,image_url,category,shipping_scope,created_at,sponsor:sponsors!inner(id,business_name,city,status,listing_type)&is_active=eq.true&sponsors.status=eq.approved&sponsors.listing_type=eq.shop&order=created_at.desc',
    'products?select=id,title,description,price_cents,image_url,category,created_at,sponsor:sponsors!inner(id,business_name,city,status,listing_type)&is_active=eq.true&sponsors.status=eq.approved&sponsors.listing_type=eq.shop&order=created_at.desc',
    'products?select=id,title,description,price_cents,image_url,created_at,sponsor:sponsors!inner(id,business_name,city,status,listing_type)&is_active=eq.true&sponsors.status=eq.approved&sponsors.listing_type=eq.shop&order=created_at.desc',
    'products?select=id,title,description,price_cents,image_url,created_at,sponsor_id,sponsors(id,business_name,city,status,listing_type)&is_active=eq.true&order=created_at.desc',
  ];

  for (const path of selects) {
    try {
      const rows = await supabaseRest(path);
      if (!Array.isArray(rows)) continue;
      if (path.includes('sponsors!inner')) return rows;
      return rows.filter(
        (p) => p.sponsors?.status === 'approved' && p.sponsors?.listing_type === 'shop'
      );
    } catch {
      // try next select shape (older schemas may lack category/shipping_scope)
    }
  }
  return [];
}

export default async function ShopPage() {
  const items = await loadShopProducts();

  return (
    <div className="shop-page">
      <section className="shop-hero shop-hero--compact">
        <div className="container shop-hero-inner">
          <p className="shop-kicker">Tulip Town Marketplace</p>
          <h1 className="shop-brand">튤립가게</h1>
          <p className="shop-lead">
            승인된 사업자 판매자의 상품입니다. 판매자에게 직접 연락해 거래하세요.
          </p>
          <p className="shop-pricing-note">
            일반 셀러 월 $10 또는 연 $100(2개월 무료) · 최대 6개 · 프로 셀러 월 $20 또는 연
            $200(2개월 무료) · 최대 20개 · 이후 10개당 +$8/월
          </p>
        </div>
      </section>

      <div className="container" id="shop-grid">
        <ShopCatalog items={items} />
      </div>
    </div>
  );
}
