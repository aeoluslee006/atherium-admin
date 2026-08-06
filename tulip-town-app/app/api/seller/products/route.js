import { NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/apiAuth';
import { SELLER_PRODUCT_LIMIT, canManageProducts } from '../../../../lib/sellerConstants';

async function getMySeller(db, userId) {
  const { data, error } = await db
    .from('gift_sellers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const seller = await getMySeller(db, user.id);
    if (!seller) return NextResponse.json({ products: [], seller: null });

    const { data, error } = await db
      .from('gift_products')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ products: data || [], seller });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const seller = await getMySeller(db, user.id);
    if (!canManageProducts(seller)) {
      return NextResponse.json(
        { error: '승인 + 월 구독 후 상품을 등록할 수 있습니다.' },
        { status: 400 }
      );
    }

    const { count, error: countErr } = await db
      .from('gift_products')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', seller.id);
    if (countErr) throw countErr;
    const limit = seller.product_limit || SELLER_PRODUCT_LIMIT;
    if ((count || 0) >= limit) {
      return NextResponse.json({ error: `상품은 최대 ${limit}개까지 등록할 수 있습니다.` }, { status: 400 });
    }

    const body = await request.json();
    const nameKo = String(body.name_ko || '').trim();
    const priceCents = Math.round(Number(body.price_usd || 0) * 100);
    const blurb = String(body.blurb || '').trim();
    if (!nameKo || !blurb || !Number.isFinite(priceCents) || priceCents < 0) {
      return NextResponse.json({ error: '상품명, 설명, 가격을 확인해 주세요.' }, { status: 400 });
    }

    const row = {
      seller_id: seller.id,
      name_ko: nameKo,
      name_en: String(body.name_en || '').trim() || null,
      category: ['local', 'care', 'kids', 'community'].includes(body.category)
        ? body.category
        : 'local',
      blurb,
      price_cents: priceCents,
      compare_at_cents: body.compare_at_usd
        ? Math.round(Number(body.compare_at_usd) * 100)
        : null,
      image_url: String(body.image_url || '').trim() || null,
      badge: String(body.badge || '').trim() || null,
      is_gift: body.is_gift !== false,
      is_online_only: !!body.is_online_only,
      is_published: body.is_published !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db.from('gift_products').insert(row).select('*').single();
    if (error) throw error;
    return NextResponse.json({ product: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const seller = await getMySeller(db, user.id);
    if (!canManageProducts(seller)) {
      return NextResponse.json({ error: '상품을 수정할 수 없습니다.' }, { status: 400 });
    }

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const patch = { updated_at: new Date().toISOString() };
    if ('name_ko' in body) patch.name_ko = String(body.name_ko || '').trim();
    if ('name_en' in body) patch.name_en = String(body.name_en || '').trim() || null;
    if ('blurb' in body) patch.blurb = String(body.blurb || '').trim();
    if ('category' in body && ['local', 'care', 'kids', 'community'].includes(body.category)) {
      patch.category = body.category;
    }
    if ('price_usd' in body) patch.price_cents = Math.round(Number(body.price_usd) * 100);
    if ('compare_at_usd' in body) {
      patch.compare_at_cents = body.compare_at_usd
        ? Math.round(Number(body.compare_at_usd) * 100)
        : null;
    }
    if ('image_url' in body) patch.image_url = String(body.image_url || '').trim() || null;
    if ('badge' in body) patch.badge = String(body.badge || '').trim() || null;
    if ('is_published' in body) patch.is_published = !!body.is_published;
    if ('is_gift' in body) patch.is_gift = !!body.is_gift;
    if ('is_online_only' in body) patch.is_online_only = !!body.is_online_only;

    const { data, error } = await db
      .from('gift_products')
      .update(patch)
      .eq('id', body.id)
      .eq('seller_id', seller.id)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ product: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const seller = await getMySeller(db, user.id);
    if (!seller) return NextResponse.json({ error: '판매자 없음' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await db
      .from('gift_products')
      .delete()
      .eq('id', id)
      .eq('seller_id', seller.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
