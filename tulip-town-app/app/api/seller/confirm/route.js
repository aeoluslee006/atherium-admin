import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import { getStripe } from '../../../../lib/stripe';

/**
 * Confirms seller subscription Checkout Session and marks subscription active.
 */
export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const body = await request.json();
    const sessionId = body.session_id;
    if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.metadata?.kind !== 'seller_subscription') {
      return NextResponse.json({ error: 'Not a seller subscription session' }, { status: 400 });
    }
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: '결제가 아직 완료되지 않았습니다.' }, { status: 400 });
    }

    const sellerId = session.metadata?.seller_id;
    if (!sellerId) return NextResponse.json({ error: 'seller_id missing' }, { status: 400 });

    const subscription =
      typeof session.subscription === 'object' && session.subscription
        ? session.subscription
        : null;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : subscription?.id || null;
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
    const periodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const patch = {
      subscription_status: 'active',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      subscription_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    };

    const admin = tryAdminSupabase();
    const writer = admin || db;
    const { data, error } = await writer
      .from('gift_sellers')
      .update(patch)
      .eq('id', sellerId)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data && admin) {
      const { data: byId, error: e2 } = await admin
        .from('gift_sellers')
        .update(patch)
        .eq('id', sellerId)
        .select('*')
        .single();
      if (e2) throw e2;
      return NextResponse.json({ seller: byId });
    }

    return NextResponse.json({ seller: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Confirm failed' }, { status: 500 });
  }
}
