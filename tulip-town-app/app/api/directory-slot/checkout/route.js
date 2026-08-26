import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import { isValidDirectoryCategory } from '../../../../lib/directoryCategories';
import { getAppUrl, getStripe } from '../../../../lib/stripe';

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const slotId = body.slot_id;
    const businessName = String(body.business_name || body.ad_title || '').trim();
    const categorySlug = String(body.category_slug || '').trim();
    const adPhone = String(body.ad_phone || '').trim();
    const adImageUrl = String(body.ad_image_url || '').trim() || null;
    const adTitle = String(body.ad_title || businessName).trim();

    if (!slotId || !businessName || !adPhone) {
      return NextResponse.json({ error: '슬롯, 업체명, 전화번호는 필수입니다.' }, { status: 400 });
    }
    if (!isValidDirectoryCategory(categorySlug)) {
      return NextResponse.json({ error: '유효한 카테고리를 선택해 주세요.' }, { status: 400 });
    }

    const admin = tryAdminSupabase();
    const reader = admin || db;

    const { data: slot, error: slotErr } = await reader
      .from('directory_slots')
      .select('*')
      .eq('id', slotId)
      .maybeSingle();
    if (slotErr) throw slotErr;
    if (!slot) return NextResponse.json({ error: '슬롯을 찾을 수 없습니다.' }, { status: 404 });
    if (slot.status !== 'available') {
      return NextResponse.json({ error: '이미 판매된 자리입니다.' }, { status: 409 });
    }

    // Soft-hold: mark occupied so two checkouts don't race; webhook/cancel restores if needed.
    if (admin) {
      const { data: held, error: holdErr } = await admin
        .from('directory_slots')
        .update({ status: 'occupied' })
        .eq('id', slotId)
        .eq('status', 'available')
        .select('id')
        .maybeSingle();
      if (holdErr) throw holdErr;
      if (!held) {
        return NextResponse.json({ error: '방금 다른 분이 신청한 자리입니다.' }, { status: 409 });
      }
    }

    try {
      const stripe = getStripe();
      const appUrl = getAppUrl();
      const amountCents = Number(slot.base_price_cents) || 1800;
      const label = `지면 광고 ${slot.page_number}면 ${slot.position_label} (${slot.size_tier})`;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: amountCents,
              recurring: { interval: 'month' },
              product_data: { name: label },
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/directory?checkout=success&session_id={CHECKOUT_SESSION_ID}&page=${slot.page_number}`,
        cancel_url: `${appUrl}/directory/pages/apply?slot=${encodeURIComponent(slotId)}&checkout=cancel`,
        metadata: {
          kind: 'directory_slot',
          slot_id: slotId,
          user_id: user.id,
          business_name: businessName,
          ad_title: adTitle,
          category_slug: categorySlug,
          ad_phone: adPhone,
          ad_image_url: adImageUrl || '',
          amount_cents: String(amountCents),
        },
        subscription_data: {
          metadata: {
            kind: 'directory_slot',
            slot_id: slotId,
            user_id: user.id,
            business_name: businessName,
            ad_title: adTitle,
            category_slug: categorySlug,
            ad_phone: adPhone,
            ad_image_url: adImageUrl || '',
          },
        },
      });

      return NextResponse.json({ url: session.url, session_id: session.id });
    } catch (err) {
      if (admin) {
        await admin.from('directory_slots').update({ status: 'available' }).eq('id', slotId);
      }
      throw err;
    }
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
