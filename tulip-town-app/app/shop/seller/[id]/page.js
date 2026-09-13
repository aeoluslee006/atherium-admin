import Link from 'next/link';
import { notFound } from 'next/navigation';
import MemberTierBadge from '../../../../components/MemberTierBadge';
import ShopCatalog from '../../../../components/ShopCatalog';
import { getTierMeta } from '../../../../lib/memberTier';
import { loadFavoriteProductIds } from '../../../../lib/shopFavorites';
import { loadSellerReviewCount } from '../../../../lib/shopReviews';
import { loadSellerTrust } from '../../../../lib/shopSellerTrust';
import { supabaseRest } from '../../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

async function loadSeller(id) {
  const selects = [
    `sponsors?select=id,business_name,city,description,status,listing_type,submitted_by&id=eq.${encodeURIComponent(id)}&listing_type=eq.shop&status=eq.approved&limit=1`,
    `sponsors?select=id,business_name,city,description,status,listing_type&id=eq.${encodeURIComponent(id)}&listing_type=eq.shop&status=eq.approved&limit=1`,
  ];

  for (const path of selects) {
    try {
      const rows = await supabaseRest(path);
      const seller = Array.isArray(rows) ? rows[0] : null;
      if (seller) return seller;
    } catch {
      // try next select shape
    }
  }
  return null;
}

async function loadSellerProducts(sponsorId, seller) {
  const selects = [
    `products?select=id,title,description,price_cents,image_url,image_urls,category,shipping_scope,created_at,sponsor_id&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`,
    `products?select=id,title,description,price_cents,image_url,category,shipping_scope,created_at,sponsor_id&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`,
    `products?select=id,title,description,price_cents,image_url,category,created_at,sponsor_id&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`,
    `products?select=id,title,price_cents,image_url,created_at,sponsor_id&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`,
  ];

  for (const path of selects) {
    try {
      const rows = await supabaseRest(path);
      if (!Array.isArray(rows)) continue;
      return rows.map((item) => ({
        ...item,
        sponsor: {
          id: seller.id,
          business_name: seller.business_name,
          city: seller.city,
          status: seller.status,
          listing_type: seller.listing_type,
        },
      }));
    } catch {
      // try next select shape
    }
  }
  return [];
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

  const [products, sellerTrust, favoriteIds, reviewCount] = await Promise.all([
    loadSellerProducts(seller.id, seller),
    loadSellerTrust(seller),
    loadFavoriteProductIds(),
    loadSellerReviewCount(seller.id),
  ]);
  const tierMeta = getTierMeta(sellerTrust.tier);

  return (
    <div className="shop-page">
      <div className="container" style={{ paddingTop: 28, paddingBottom: 8 }}>
        <Link href="/shop" className="btn btn-outline">
          튤립가게
        </Link>

        <header className="shop-seller-profile">
          <h1 className="shop-seller-profile-name">{seller.business_name}</h1>
          <div className="shop-seller-profile-meta">
            {seller.city ? <span>{seller.city}</span> : null}
            {seller.city ? <span aria-hidden="true"> · </span> : null}
            <span>상품 {products.length}개</span>
            <span aria-hidden="true"> · </span>
            <span>거래 좋아요 {reviewCount}</span>
          </div>

          <div className="shop-seller-trust" aria-label="판매자 등급">
            <MemberTierBadge tier={sellerTrust.tier} />
            <span className="shop-seller-trust-text">
              {tierMeta.labelKo} 등급
              {sellerTrust.tenureLabel ? ` · ${sellerTrust.tenureLabel}` : ''}
            </span>
          </div>

          {seller.description ? (
            <p className="shop-seller-profile-bio">{seller.description}</p>
          ) : null}
        </header>
      </div>

      <div className="container" id="shop-grid">
        <ShopCatalog
          items={products}
          sectionTitle={`${seller.business_name} 상품`}
          showSellerLink={false}
          favoriteIds={favoriteIds}
        />
      </div>
    </div>
  );
}
