import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabase } from '../../../../lib/supabaseAdmin';
import { getAppUrl, getStripe } from '../../../../lib/stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY';

async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const client = createClient(supabaseUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.auth.getUser(token);
  return data.user || null;
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const body = await request.json();
    const sponsorId = body.sponsor_id;
    if (!sponsorId) return NextResponse.json({ error: 'sponsor_id required' }, { status: 400 });

    const admin = createAdminSupabase();
    const { data: sponsor, error: sponsorErr } = await admin
      .from('sponsors')
      .select('*')
      .eq('id', sponsorId)
      .maybeSingle();
    if (sponsorErr) throw sponsorErr;
    if (!sponsor) return NextResponse.json({ error: '업체를 찾을 수 없습니다.' }, { status: 404 });
    if (sponsor.submitted_by && sponsor.submitted_by !== user.id) {
      return NextResponse.json({ error: '본인이 등록한 업체만 결제할 수 있습니다.' }, { status: 403 });
    }

    const { data: pricing, error: pricingErr } = await admin
      .from('pricing_settings')
      .select('*')
      .eq('key', 'directory_monthly')
      .eq('is_active', true)
      .maybeSingle();
    if (pricingErr) throw pricingErr;
    if (!pricing) {
      return NextResponse.json({ error: '활성화된 요금 설정이 없습니다.' }, { status: 400 });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const priceId = process.env.STRIPE_PRICE_ID;

    let lineItems;
    if (priceId) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else {
      lineItems = [
        {
          price_data: {
            currency: (pricing.currency || 'usd').toLowerCase(),
            unit_amount: pricing.amount_cents,
            recurring: { interval: 'month' },
            product_data: {
              name: pricing.label || 'Business directory monthly listing',
            },
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: lineItems,
      success_url: `${appUrl}/directory?checkout=success`,
      cancel_url: `${appUrl}/directory/new?checkout=cancel`,
      metadata: {
        sponsor_id: sponsor.id,
        user_id: user.id,
        pricing_key: 'directory_monthly',
      },
      subscription_data: {
        metadata: {
          sponsor_id: sponsor.id,
          user_id: user.id,
          pricing_key: 'directory_monthly',
        },
      },
    });

    const { error: payErr } = await admin.from('payments').insert({
      sponsor_id: sponsor.id,
      status: 'pending',
      amount_cents: pricing.amount_cents,
      currency: (pricing.currency || 'usd').toLowerCase(),
      stripe_customer_id: session.customer || null,
      stripe_subscription_id: null,
    });
    if (payErr) {
      // Non-fatal if a pending row already exists; checkout can still proceed.
      console.warn('payments insert warning', payErr.message);
    }

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
