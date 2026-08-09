import { NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/apiAuth';

export async function GET(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const { data, error } = await db
      .from('gift_sellers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ seller: data || null });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const body = await request.json();
    const shopName = String(body.shop_name || '').trim();
    const contactName = String(body.contact_name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || user.email || '').trim();
    const city = String(body.city || '').trim();
    const sellerType = body.seller_type === 'business' ? 'business' : 'individual';
    const businessName = String(body.business_name || '').trim() || null;
    const bio = String(body.bio || '').trim();
    const pickupNote = String(body.pickup_note || '').trim() || null;

    if (!shopName || !contactName || !phone || !email || !city || !bio) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해 주세요.' }, { status: 400 });
    }
    if (!body.agree) {
      return NextResponse.json({ error: '판매 약관에 동의해 주세요.' }, { status: 400 });
    }

    const { data: existing } = await db
      .from('gift_sellers')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && existing.status !== 'rejected') {
      return NextResponse.json({ error: '이미 판매자 신청이 있습니다.' }, { status: 400 });
    }

    const row = {
      user_id: user.id,
      shop_name: shopName,
      contact_name: contactName,
      phone,
      email,
      city,
      seller_type: sellerType,
      business_name: sellerType === 'business' ? businessName : null,
      bio,
      pickup_note: pickupNote,
      status: 'pending',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing?.status === 'rejected') {
      const { data, error } = await db
        .from('gift_sellers')
        .update(row)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await db.from('gift_sellers').insert(row).select('*').single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ seller: result });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
