import { NextResponse } from 'next/server';
import { getAppUrl, hasStripeWebhook, isStripeConfigured } from '../../../../lib/stripe';

export async function GET() {
  const configured = isStripeConfigured();
  let accountHint = null;

  if (configured) {
    try {
      const { getStripe } = await import('../../../../lib/stripe');
      const stripe = getStripe();
      // Lightweight probe — create nothing, just confirm the key authenticates.
      const products = await stripe.products.list({ limit: 1 });
      accountHint = { ok: true, product_count_sample: products.data.length };
    } catch (err) {
      accountHint = { ok: false, error: err.message };
    }
  }

  return NextResponse.json({
    stripe_configured: configured,
    webhook_configured: hasStripeWebhook(),
    app_url: getAppUrl(),
    publishable_key_set: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    service_role_set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    probe: accountHint,
  });
}
