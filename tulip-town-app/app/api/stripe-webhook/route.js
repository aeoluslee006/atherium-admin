import { NextResponse } from 'next/server';
import { createAdminSupabase } from '../../../lib/supabaseAdmin';
import { getStripe } from '../../../lib/stripe';

export const runtime = 'nodejs';

async function upsertPaymentFromSubscription({
  admin,
  sponsorId,
  subscription,
  status,
  amountCents,
  currency,
}) {
  const stripeSubscriptionId = subscription?.id || null;
  const stripeCustomerId =
    typeof subscription?.customer === 'string'
      ? subscription.customer
      : subscription?.customer?.id || null;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const patch = {
    sponsor_id: sponsorId || null,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: stripeCustomerId,
    status,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };
  if (typeof amountCents === 'number') patch.amount_cents = amountCents;
  if (currency) patch.currency = currency;

  if (stripeSubscriptionId) {
    const { data: existing } = await admin
      .from('payments')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await admin.from('payments').update(patch).eq('id', existing.id);
      if (error) throw error;
      return;
    }
  }

  if (sponsorId) {
    const { data: pending } = await admin
      .from('payments')
      .select('id')
      .eq('sponsor_id', sponsorId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pending?.id) {
      const { error } = await admin.from('payments').update(patch).eq('id', pending.id);
      if (error) throw error;
      return;
    }
  }

  const { error } = await admin.from('payments').insert(patch);
  if (error) throw error;
}

async function syncSellerSubscription(admin, subscription, status) {
  const sellerId = subscription?.metadata?.seller_id;
  if (!sellerId || subscription?.metadata?.kind !== 'seller_subscription') return false;

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const { error } = await admin
    .from('gift_sellers')
    .update({
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      subscription_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sellerId);
  if (error) throw error;
  return true;
}

async function syncShopSponsorPlan(admin, subscriptionOrSession) {
  const meta = subscriptionOrSession?.metadata || {};
  const kind = meta.kind;
  const sponsorId = meta.sponsor_id;
  if (!sponsorId) return false;
  if (kind !== 'shop_upgrade' && kind !== 'shop_subscription') return false;

  const patch = {};
  if (kind === 'shop_upgrade') {
    patch.plan_tier = 'extended';
    patch.product_limit = 30;
  } else if (kind === 'shop_subscription') {
    // Keep defaults; ensure basic tier if unset
    patch.plan_tier = 'basic';
    patch.product_limit = 6;
  }

  const { error } = await admin.from('sponsors').update(patch).eq('id', sponsorId).eq('listing_type', 'shop');
  if (error) throw error;
  return true;
}

export async function POST(request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET missing' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature error: ${err.message}` }, { status: 400 });
  }

  const admin = createAdminSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (
          session.metadata?.kind === 'shop_upgrade' ||
          session.metadata?.kind === 'shop_subscription'
        ) {
          await syncShopSponsorPlan(admin, session);
          if (session.subscription) {
            const subscriptionId =
              typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription?.id;
            if (subscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              await syncShopSponsorPlan(admin, subscription);
            }
          }
          break;
        }
        if (session.metadata?.kind === 'seller_subscription') {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await syncSellerSubscription(admin, subscription, 'active');
          } else if (session.metadata?.seller_id) {
            await admin
              .from('gift_sellers')
              .update({
                subscription_status: 'active',
                stripe_customer_id:
                  typeof session.customer === 'string' ? session.customer : null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', session.metadata.seller_id);
          }
          break;
        }

        const sponsorId = session.metadata?.sponsor_id;
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        let subscription = null;
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        }
        await upsertPaymentFromSubscription({
          admin,
          sponsorId,
          subscription,
          status: 'active',
          amountCents: session.amount_total ?? undefined,
          currency: session.currency || 'usd',
        });
        if (sponsorId) {
          await admin
            .from('sponsors')
            .update({ status: 'approved', approved_at: new Date().toISOString() })
            .eq('id', sponsorId);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (await syncShopSponsorPlan(admin, subscription)) break;
          if (await syncSellerSubscription(admin, subscription, 'active')) break;
          const sponsorId = subscription.metadata?.sponsor_id;
          await upsertPaymentFromSubscription({
            admin,
            sponsorId,
            subscription,
            status: 'active',
            amountCents: invoice.amount_paid,
            currency: invoice.currency,
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (await syncSellerSubscription(admin, subscription, 'past_due')) break;
          const sponsorId = subscription.metadata?.sponsor_id;
          await upsertPaymentFromSubscription({
            admin,
            sponsorId,
            subscription,
            status: 'past_due',
            amountCents: invoice.amount_due,
            currency: invoice.currency,
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        if (await syncSellerSubscription(admin, subscription, 'canceled')) break;
        const sponsorId = subscription.metadata?.sponsor_id;
        await upsertPaymentFromSubscription({
          admin,
          sponsorId,
          subscription,
          status: 'canceled',
        });
        if (sponsorId) {
          await admin.from('sponsors').update({ status: 'pending', approved_at: null }).eq('id', sponsorId);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('stripe webhook handler error', err);
    return NextResponse.json({ error: err.message || 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
