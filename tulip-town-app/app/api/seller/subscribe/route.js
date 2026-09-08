import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import {
  SHOP_EXTENDED_PLAN,
  SHOP_EXTENDED_PRODUCT_LIMIT,
  SHOP_EXTRA_PACK_DEFAULT_CENTS,
  SHOP_EXTRA_PACK_KEY,
  SHOP_EXTRA_PACK_SIZE,
  SHOP_MONTHLY_KEY,
  SHOP_UPGRADE_MONTHLY_KEY,
  SHOP_UPGRADE_YEARLY_KEY,
  SHOP_YEARLY_KEY,
  shopProductLimit,
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
    const plan =
      body.plan === 'upgrade' ? 'upgrade' : body.plan === 'extra_pack' ? 'extra_pack' : 'basic';
    const interval = body.interval === 'year' ? 'year' : 'month';

    if (plan === 'extra_pack' && interval === 'year') {
      return NextResponse.json(
        { error: '상품 추가 팩은 월 구독만 지원합니다.' },
        { status: 400 }
      );
    }

    const pricingKey =
      plan === 'upgrade'
        ? interval === 'year'
          ? SHOP_UPGRADE_YEARLY_KEY
          : SHOP_UPGRADE_MONTHLY_KEY
        : plan === 'extra_pack'
          ? SHOP_EXTRA_PACK_KEY
          : interval === 'year'
            ? SHOP_YEARLY_KEY
            : SHOP_MONTHLY_KEY;

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
    if (plan === 'upgrade' && sponsor.plan_tier === SHOP_EXTENDED_PLAN) {
      return NextResponse.json({ error: '이미 프로 셀러 요금제입니다.' }, { status: 400 });
    }
    if (plan === 'extra_pack' && sponsor.plan_tier !== SHOP_EXTENDED_PLAN) {
      return NextResponse.json(
        { error: '상품 10개 추가는 프로 셀러만 구매할 수 있습니다.' },
        { status: 400 }
      );
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

    const defaults = {
      basic_month: 1000,
      basic_year: 10000,
      upgrade_month: 2000,
      upgrade_year: 20000,
      extra_pack_month: SHOP_EXTRA_PACK_DEFAULT_CENTS,
    };
    const defaultKey = `${plan === 'extra_pack' ? 'extra_pack' : plan}_${interval}`;
    const amountCents = pricing?.amount_cents ?? defaults[defaultKey];
    const currency = (pricing?.currency || 'usd').toLowerCase();
    const labels = {
      basic_month: '일반 셀러 (월 · 최대 6개)',
      basic_year: '일반 셀러 (연 · 최대 6개)',
      upgrade_month: '프로 셀러 (월 · 최대 20개)',
      upgrade_year: '프로 셀러 (연 · 최대 20개)',
      extra_pack_month: '상품 10개 추가 (+$8/월)',
    };
    const label = pricing?.label || labels[defaultKey];

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const kind =
      plan === 'upgrade'
        ? 'shop_upgrade'
        : plan === 'extra_pack'
          ? 'shop_extra_pack'
          : 'shop_subscription';

    const currentLimit = shopProductLimit(sponsor);
    const nextLimit =
      plan === 'extra_pack' ? currentLimit + SHOP_EXTRA_PACK_SIZE : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            recurring: { interval },
            product_data: { name: label },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/mypage/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${appUrl}/mypage/shop?checkout=cancel`,
      metadata: {
        kind,
        sponsor_id: sponsor.id,
        user_id: user.id,
        pricing_key: pricingKey,
        billing_interval: interval,
        ...(nextLimit != null
          ? {
              next_product_limit: String(nextLimit),
              add_packs: '1',
              pack_size: String(SHOP_EXTRA_PACK_SIZE),
            }
          : {}),
      },
      subscription_data: {
        metadata: {
          kind,
          sponsor_id: sponsor.id,
          user_id: user.id,
          pricing_key: pricingKey,
          billing_interval: interval,
          ...(nextLimit != null
            ? {
                next_product_limit: String(nextLimit),
                add_packs: '1',
                pack_size: String(SHOP_EXTRA_PACK_SIZE),
              }
            : {}),
        },
      },
    });

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
      next_product_limit: nextLimit ?? null,
      base_pro_limit: SHOP_EXTENDED_PRODUCT_LIMIT,
      interval,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
