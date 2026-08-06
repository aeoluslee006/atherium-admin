import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import { SELLER_PLAN_KEY } from '../../../../lib/sellerConstants';
import { getAppUrl, getStripe } from '../../../../lib/stripe';

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const { data: seller, error: sellerErr } = await db
      .from('gift_sellers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (sellerErr) throw sellerErr;
    if (!seller) return NextResponse.json({ error: '판매자 신청이 없습니다.' }, { status: 404 });
    if (seller.status !== 'approved') {
      return NextResponse.json({ error: '관리자 승인 후 구독할 수 있습니다.' }, { status: 400 });
    }
    if (seller.subscription_status === 'active') {
      return NextResponse.json({ error: '이미 구독 중입니다.' }, { status: 400 });
    }

    const admin = tryAdminSupabase();
    const reader = admin || db;
    const { data: pricing, error: pricingErr } = await reader
      .from('pricing_settings')
      .select('*')
      .eq('key', SELLER_PLAN_KEY)
      .eq('is_active', true)
      .maybeSingle();
    if (pricingErr) throw pricingErr;

    const amountCents = pricing?.amount_cents ?? 1500;
    const currency = (pricing?.currency || 'usd').toLowerCase();
    const label = pricing?.label || '튤립가게 판매자 월 구독';

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: seller.email || user.email,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            recurring: { interval: 'month' },
            product_data: { name: label },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/seller?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/seller?checkout=cancel`,
      metadata: {
        kind: 'seller_subscription',
        seller_id: seller.id,
        user_id: user.id,
        pricing_key: SELLER_PLAN_KEY,
      },
      subscription_data: {
        metadata: {
          kind: 'seller_subscription',
          seller_id: seller.id,
          user_id: user.id,
          pricing_key: SELLER_PLAN_KEY,
        },
      },
    });

    await db
      .from('gift_sellers')
      .update({
        subscription_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', seller.id);

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
