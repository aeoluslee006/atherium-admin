import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../../../../lib/apiAuth';

/** Public catalog of seller-listed products (RLS allows published + active sellers). */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('cat');

    const db = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let q = db
      .from('gift_products')
      .select(
        'id, name_ko, name_en, category, blurb, price_cents, compare_at_cents, image_url, badge, is_gift, is_online_only, created_at, seller_id, gift_sellers(shop_name, city, charges_enabled)'
      )
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(60);

    if (category && category !== 'all') {
      q = q.eq('category', category);
    }

    const { data, error } = await q;
    if (error) {
      // Table may not exist yet before SQL is run
      return NextResponse.json({ products: [], error: error.message });
    }

    const products = (data || []).map((p) => ({
      id: p.id,
      nameKo: p.name_ko,
      nameEn: p.name_en,
      category: p.category,
      vendor: p.gift_sellers?.shop_name || '입점 판매자',
      city: p.gift_sellers?.city || null,
      priceUsd: (p.price_cents || 0) / 100,
      compareAtUsd: p.compare_at_cents ? p.compare_at_cents / 100 : null,
      blurb: p.blurb,
      image:
        p.image_url ||
        'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80',
      badge: p.badge,
      giftOnly: p.is_gift,
      onlineOnly: p.is_online_only,
      sellerId: p.seller_id,
      chargesEnabled: !!p.gift_sellers?.charges_enabled,
      source: 'marketplace',
    }));

    return NextResponse.json({ products });
  } catch (err) {
    return NextResponse.json({ products: [], error: err.message });
  }
}
