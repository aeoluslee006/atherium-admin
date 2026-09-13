import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '../../../../lib/stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY';

function tryAdmin() {
  try {
    // eslint-disable-next-line global-require
    const { createAdminSupabase } = require('../../../../lib/supabaseAdmin');
    return createAdminSupabase();
  } catch {
    return null;
  }
}

/**
 * Confirms a Checkout Session after redirect (webhook backup).
 * Activates the sponsor listing when payment_status is paid.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const sessionId = body.session_id;
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { error: '결제가 아직 완료되지 않았습니다.', status: session.status, payment_status: session.payment_status },
        { status: 400 }
      );
    }

    const sponsorId = session.metadata?.sponsor_id;
    if (!sponsorId) {
      return NextResponse.json({ error: 'session metadata missing sponsor_id' }, { status: 400 });
    }

    const subscription =
      typeof session.subscription === 'object' && session.subscription
        ? session.subscription
        : null;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : subscription?.id || null;
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id || null;
    const periodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const paymentPatch = {
      sponsor_id: sponsorId,
      status: 'active',
      amount_cents: session.amount_total ?? undefined,
      currency: session.currency || 'usd',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    };

    const admin = tryAdmin();
    let db = admin;
    if (!db) {
      const authHeader = request.headers.get('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        return NextResponse.json(
          {
            ok: true,
            sponsor_id: sponsorId,
            warning:
              '결제 확인됨. SUPABASE_SERVICE_ROLE_KEY가 없어 DB 자동 승인을 건너뜁니다. 관리자가 수동 승인하거나 service role을 설정하세요.',
          },
          { status: 200 }
        );
      }
      db = createClient(supabaseUrl, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }

    if (subscriptionId) {
      const { data: existing } = await db
        .from('payments')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
      if (existing?.id) {
        await db.from('payments').update(paymentPatch).eq('id', existing.id);
      } else {
        const { data: pending } = await db
          .from('payments')
          .select('id')
          .eq('sponsor_id', sponsorId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pending?.id) {
          await db.from('payments').update(paymentPatch).eq('id', pending.id);
        } else {
          await db.from('payments').insert(paymentPatch);
        }
      }
    } else {
      await db.from('payments').insert(paymentPatch);
    }

    const { error: sponsorErr } = await db
      .from('sponsors')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', sponsorId);

    if (sponsorErr) {
      return NextResponse.json({
        ok: true,
        sponsor_id: sponsorId,
        warning: `결제 확인됨. 업체 승인 업데이트 실패: ${sponsorErr.message}`,
      });
    }

    return NextResponse.json({ ok: true, sponsor_id: sponsorId, status: 'approved' });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Confirm failed' }, { status: 500 });
  }
}
