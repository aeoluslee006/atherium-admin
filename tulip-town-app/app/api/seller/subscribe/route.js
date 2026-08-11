import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import {
  SHOP_MONTHLY_KEY,
  SHOP_UPGRADE_MONTHLY_KEY,
} from '../../../../lib/sellerConstants';
import { getAppUrl, getStripe } from '../../../../lib/stripe';

async function getShopSponsor(db, userId) {
  const { data, error } = await db
    .from('sponsors')
    .select('*')
    .eq('listing_type', 'shop')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const plan = body.plan === 'upgrade' ? 'upgrade' : 'basic';
    const pricingKey = plan === 'upgrade' ? SHOP_UPGRADE_MONTHLY_KEY : SHOP_MONTHLY_KEY;

    const sponsor = await getShopSponsor(db, user.id);
    if (!sponsor) {
      return NextResponse.json(
        { error: '입점 신청이 없습니다. 먼저 사업자 입점을 신청해 주세요.' },
        { status: 404 }
      );
    }
    if (sponsor.status !== 'approved') {
      return NextResponse.json({ error: '관리자 승인 후 구독할 수 있습니다.' }, { status: 400 });
    }
    if (plan === 'upgrade' && sponsor.plan_tier === 'extended') {
      return NextResponse.json({ error: '이미 확장 요금제입니다.' }, { status: 400 });
    }

    const admin = tryAdminSupabase();
    const reader = admin || db;
    const { data: pricing, error: pricingErr } = await reader
      .from('pricing_settings')
      .select('*')
      .eq('key', pricingKey)
      .eq('is_active', true)
      .maybeSingle();
    if (pricingErr) throw pricingErr;

    const amountCents =
      pricing?.amount_cents ?? (plan === 'upgrade' ? 2000 : 1000);
    const currency = (pricing?.currency || 'usd').toLowerCase();
    const label =
      pricing?.label ||
      (plan === 'upgrade' ? '튤립가게 확장 요금제 (+$20)' : '튤립가게 월 구독 ($10)');

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const kind = plan === 'upgrade' ? 'shop_upgrade' : 'shop_subscription';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
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
      success_url: `${appUrl}/seller?checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${appUrl}/seller?checkout=cancel`,
      metadata: {
        kind,
        sponsor_id: sponsor.id,
        user_id: user.id,
        pricing_key: pricingKey,
      },
      subscription_data: {
        metadata: {
          kind,
          sponsor_id: sponsor.id,
          user_id: user.id,
          pricing_key: pricingKey,
        },
      },
    });

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
