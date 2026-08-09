import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import { getAppUrl, getStripe } from '../../../../lib/stripe';

/**
 * Creates or resumes Stripe Connect Express onboarding for the seller.
 * Individuals without a registered business are supported (Stripe account type: express).
 */
export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const { data: seller, error } = await db
      .from('gift_sellers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!seller) return NextResponse.json({ error: '판매자 정보가 없습니다.' }, { status: 404 });
    if (seller.status !== 'approved') {
      return NextResponse.json({ error: '관리자 승인 후 Connect를 연결할 수 있습니다.' }, { status: 400 });
    }
    if (seller.subscription_status !== 'active') {
      return NextResponse.json({ error: '월 구독 후 정산 계좌를 연결해 주세요.' }, { status: 400 });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();
    let accountId = seller.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: seller.email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: seller.seller_type === 'business' ? 'company' : 'individual',
        metadata: {
          seller_id: seller.id,
          user_id: user.id,
          shop_name: seller.shop_name,
        },
      });
      accountId = account.id;

      const admin = tryAdminSupabase();
      const writer = admin || db;
      await writer
        .from('gift_sellers')
        .update({
          stripe_account_id: accountId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seller.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/seller?connect=refresh`,
      return_url: `${appUrl}/seller?connect=return`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, account_id: accountId });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Connect onboarding failed' }, { status: 500 });
  }
}

/** Refresh Connect account status (charges_enabled). */
export async function GET(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const { data: seller, error } = await db
      .from('gift_sellers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!seller?.stripe_account_id) {
      return NextResponse.json({ seller, charges_enabled: false });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(seller.stripe_account_id);
    const patch = {
      charges_enabled: !!account.charges_enabled,
      details_submitted: !!account.details_submitted,
      updated_at: new Date().toISOString(),
    };

    const admin = tryAdminSupabase();
    const writer = admin || db;
    const { data: updated, error: upErr } = await writer
      .from('gift_sellers')
      .update(patch)
      .eq('id', seller.id)
      .select('*')
      .single();
    if (upErr) throw upErr;

    return NextResponse.json({
      seller: updated,
      charges_enabled: patch.charges_enabled,
      details_submitted: patch.details_submitted,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Connect status failed' }, { status: 500 });
  }
}
