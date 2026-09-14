import ShopCatalog from '../../components/ShopCatalog';
import { createServerT, getServerLocale } from '../../lib/i18n/server';
import { loadFavoriteCountsByProductId } from '../../lib/shopFavoriteCounts';
import { loadFavoriteProductIds } from '../../lib/shopFavorites';
import { supabaseRest } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = getServerLocale();
  const t = createServerT(locale);
  return {
    title: t('shop.metaTitle'),
    description: t('shop.metaDesc'),
  };
}

async function loadShopProducts() {
  const selects = [
    'products?select=id,title,description,price_cents,image_url,category,shipping_scope,created_at,is_active,sponsor:sponsors!inner(id,business_name,city,status,listing_type)&is_active=eq.true&sponsors.status=eq.approved&sponsors.listing_type=eq.shop&order=created_at.desc',
    'products?select=id,title,description,price_cents,image_url,category,created_at,is_active,sponsor:sponsors!inner(id,business_name,city,status,listing_type)&is_active=eq.true&sponsors.status=eq.approved&sponsors.listing_type=eq.shop&order=created_at.desc',
    'products?select=id,title,description,price_cents,image_url,created_at,is_active,sponsor:sponsors!inner(id,business_name,city,status,listing_type)&is_active=eq.true&sponsors.status=eq.approved&sponsors.listing_type=eq.shop&order=created_at.desc',
    'products?select=id,title,description,price_cents,image_url,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type)&is_active=eq.true&order=created_at.desc',
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
  const [rawItems, favoriteIds] = await Promise.all([
    loadShopProducts(),
    loadFavoriteProductIds(),
  ]);
  const favoriteCounts = await loadFavoriteCountsByProductId(rawItems.map((item) => item.id));
  const items = rawItems.map((item) => ({
    ...item,
    favorite_count: favoriteCounts[item.id] || 0,
  }));

  return (
    <div className="shop-page shop-page--product-first shop-page--yami-home">
      <div className="container shop-top" id="shop-grid">
        <ShopCatalog items={items} favoriteIds={favoriteIds} showBrandHeader />
      </div>
    </div>
  );
}
