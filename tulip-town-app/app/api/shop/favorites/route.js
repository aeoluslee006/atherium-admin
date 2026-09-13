import { NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/apiAuth';

export async function GET(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsOnly = searchParams.get('idsOnly') === '1';

    if (idsOnly) {
      const { data, error } = await db
        .from('product_favorites')
        .select('product_id')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({
        productIds: (data || []).map((row) => row.product_id).filter(Boolean),
      });
    }

    const { data, error } = await db
      .from('product_favorites')
      .select(
        'id,product_id,created_at,product:products(id,title,price_cents,image_url,image_urls,category,shipping_scope,is_active,created_at,sponsor:sponsors(id,business_name,city,status,listing_type))'
      )
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback without nested sponsor join / shipping_scope
      const basic = await db
        .from('product_favorites')
        .select(
          'id,product_id,created_at,product:products(id,title,price_cents,image_url,is_active,created_at,sponsor_id,sponsors(id,business_name,city))'
        )
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });
      if (basic.error) throw error;
      const items = (basic.data || [])
        .map((row) => normalizeFavoriteRow(row))
        .filter(Boolean);
      return NextResponse.json({ items });
    }

    const items = (data || []).map((row) => normalizeFavoriteRow(row)).filter(Boolean);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const productId = String(body.product_id || '').trim();
    if (!productId) {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await db
      .from('product_favorites')
      .select('id')
      .eq('profile_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.id) {
      const { error } = await db
        .from('product_favorites')
        .delete()
        .eq('id', existing.id)
        .eq('profile_id', user.id);
      if (error) throw error;
      return NextResponse.json({ favorited: false, productId });
    }

    const { error } = await db.from('product_favorites').insert({
      profile_id: user.id,
      product_id: productId,
    });
    if (error) throw error;
    return NextResponse.json({ favorited: true, productId });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

function normalizeFavoriteRow(row) {
  const product = row?.product || row?.products;
  if (!product?.id) {
    // Deleted product — drop from list
    return null;
  }
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
}
