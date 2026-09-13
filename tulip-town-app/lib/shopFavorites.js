import { createServerSupabase } from './supabaseServer';

/** Load favorited product ids for the current user (empty if logged out). */
export async function loadFavoriteProductIds() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('product_favorites')
      .select('product_id')
      .eq('profile_id', user.id);
    if (error) return [];
    return (data || []).map((row) => row.product_id).filter(Boolean);
  } catch {
    return [];
  }
}

/** Load favorite products for mypage (deleted products omitted; inactive = sold). */
export async function loadFavoriteProducts() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const selects = [
      'id,product_id,created_at,product:products(id,title,price_cents,image_url,image_urls,category,shipping_scope,is_active,created_at,sponsor:sponsors(id,business_name,city,status,listing_type))',
      'id,product_id,created_at,product:products(id,title,price_cents,image_url,is_active,created_at,sponsors(id,business_name,city))',
      'id,product_id,created_at,product:products(id,title,price_cents,image_url,is_active,created_at)',
    ];

    for (const select of selects) {
      const { data, error } = await supabase
        .from('product_favorites')
        .select(select)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });
      if (error) continue;

      return (data || [])
        .map((row) => {
          const product = row.product || row.products;
          if (!product?.id) return null;
          const seller = product.sponsor || product.sponsors || null;
          return {
            favoriteId: row.id,
            favoritedAt: row.created_at,
            id: product.id,
            title: product.title,
            price_cents: product.price_cents,
            image_url: product.image_url,
            image_urls: product.image_urls,
            category: product.category,
            shipping_scope: product.shipping_scope,
            is_active: product.is_active !== false,
            soldOut: product.is_active === false,
            created_at: product.created_at,
            sponsor: seller,
            sponsors: seller,
          };
        })
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}
