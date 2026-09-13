import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest, tryAdminSupabase, supabaseUrl, supabaseAnonKey } from '../../../../lib/apiAuth';
import { SELLER_FEE_PERCENT, feeCentsFromAmount } from '../../../../lib/sellerConstants';
import { getAppUrl, getStripe } from '../../../../lib/stripe';

/**
 * Buyer Checkout with Stripe Connect destination charge + 2% platform fee.
 */
export async function POST(request) {
  try {
    const { user } = await getUserFromRequest(request);
    const body = await request.json();
    const productId = body.product_id;
    const email = String(body.email || user?.email || '').trim();
    if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });
    if (!email) return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });

    const admin = tryAdminSupabase();
    let product;
    if (admin) {
      const { data, error } = await admin
        .from('gift_products')
        .select('*, gift_sellers(*)')
        .eq('id', productId)
        .maybeSingle();
      if (error) throw error;
      product = data;
    } else {
      const anonDb = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await anonDb
        .from('gift_products')
        .select('*, gift_sellers(*)')
        .eq('id', productId)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      product = data;
    }

    if (!product) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    const seller = product.gift_sellers;
    if (!seller || seller.status !== 'approved' || seller.subscription_status !== 'active') {
      return NextResponse.json({ error: '판매 중이 아닌 상품입니다.' }, { status: 400 });
    }
    if (!seller.stripe_account_id || !seller.charges_enabled) {
      return NextResponse.json(
        { error: '판매자 정산 계좌가 아직 연결되지 않았습니다.' },
        { status: 400 }
      );
    }

    const amount = product.price_cents;
    const fee = feeCentsFromAmount(amount, SELLER_FEE_PERCENT);
    const stripe = getStripe();
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: {
              name: product.name_ko,
              description: `${seller.shop_name} · 튤립가게`,
              images: product.image_url ? [product.image_url] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/gift/${product.id}?buy=success`,
      cancel_url: `${appUrl}/gift/${product.id}?buy=cancel`,
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: {
          destination: seller.stripe_account_id,
        },
        metadata: {
          kind: 'gift_purchase',
          product_id: product.id,
          seller_id: seller.id,
          fee_percent: String(SELLER_FEE_PERCENT),
        },
      },
      metadata: {
        kind: 'gift_purchase',
        product_id: product.id,
        seller_id: seller.id,
        buyer_user_id: user?.id || '',
      },
    });

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
      fee_cents: fee,
      fee_percent: SELLER_FEE_PERCENT,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
