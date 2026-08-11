import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import {
  canManageShopProducts,
  shopProductLimit,
} from '../../../../lib/sellerConstants';

async function getMyShopSponsor(db, userId) {
  const { data, error } = await db
    .from('sponsors')
    .select('id,status,listing_type,plan_tier,product_limit,business_name,submitted_by')
    .eq('listing_type', 'shop')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const sponsor = await getMyShopSponsor(db, user.id);
    if (!sponsor) return NextResponse.json({ products: [], sponsor: null });

    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('sponsor_id', sponsor.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const limit = shopProductLimit(sponsor);
    const activeCount = (data || []).filter((p) => p.is_active !== false).length;
    return NextResponse.json({
      products: data || [],
      sponsor,
      limit,
      activeCount,
      canManage: canManageShopProducts(sponsor),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const sponsor = await getMyShopSponsor(db, user.id);
    if (!canManageShopProducts(sponsor)) {
      return NextResponse.json(
        { error: '승인된 사업자만 상품을 등록할 수 있습니다. 입점 신청·승인 후 이용해 주세요.' },
        { status: 403 }
      );
    }

    const limit = shopProductLimit(sponsor);
    const { count, error: countErr } = await db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('sponsor_id', sponsor.id)
      .eq('is_active', true);
    if (countErr) throw countErr;
    if ((count || 0) >= limit) {
      return NextResponse.json(
        {
          error: `상품 한도(${limit}개)에 도달했습니다. 확장 요금제로 업그레이드해 주세요.`,
          code: 'PRODUCT_LIMIT',
          limit,
          upgrade: true,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const title = String(body.title || body.name_ko || '').trim();
    const description = String(body.description || body.blurb || '').trim();
    const priceCents =
      body.price_cents != null
        ? Math.round(Number(body.price_cents))
        : Math.round(Number(body.price_usd || 0) * 100);
    const imageUrl = String(body.image_url || '').trim() || null;

    if (!title || !description || !Number.isFinite(priceCents) || priceCents < 0) {
      return NextResponse.json({ error: '상품명, 설명, 가격을 확인해 주세요.' }, { status: 400 });
    }

    const row = {
      sponsor_id: sponsor.id,
      title,
      description,
      price_cents: priceCents,
      image_url: imageUrl,
      is_active: body.is_active !== false,
    };

    let { data, error } = await db.from('products').insert(row).select('*').single();
    if (error) {
      const admin = tryAdminSupabase();
      if (!admin) throw error;
      const retry = await admin.from('products').insert(row).select('*').single();
      if (retry.error) throw retry.error;
      data = retry.data;
    }
    return NextResponse.json({ product: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const sponsor = await getMyShopSponsor(db, user.id);
    if (!canManageShopProducts(sponsor)) {
      return NextResponse.json({ error: '상품을 수정할 수 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const patch = {};
    if ('title' in body || 'name_ko' in body) patch.title = String(body.title || body.name_ko || '').trim();
    if ('description' in body || 'blurb' in body) {
      patch.description = String(body.description || body.blurb || '').trim();
    }
    if ('price_cents' in body) patch.price_cents = Math.round(Number(body.price_cents));
    if ('price_usd' in body) patch.price_cents = Math.round(Number(body.price_usd) * 100);
    if ('image_url' in body) patch.image_url = String(body.image_url || '').trim() || null;
    if ('is_active' in body) patch.is_active = !!body.is_active;

    const { data, error } = await db
      .from('products')
      .update(patch)
      .eq('id', body.id)
      .eq('sponsor_id', sponsor.id)
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

    const sponsor = await getMyShopSponsor(db, user.id);
    if (!sponsor) return NextResponse.json({ error: '판매자 없음' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await db
      .from('products')
      .delete()
      .eq('id', id)
      .eq('sponsor_id', sponsor.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
