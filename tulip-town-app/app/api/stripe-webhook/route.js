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

async function activateDirectorySlotAd(admin, meta, subscription) {
  if (!meta || meta.kind !== 'directory_slot') return false;
  const slotId = meta.slot_id;
  const userId = meta.user_id;
  if (!slotId || !userId) return false;

  const businessName = String(meta.business_name || meta.ad_title || 'Business').trim();
  const adTitle = String(meta.ad_title || businessName).trim();
  const categorySlug = String(meta.category_slug || 'other').trim();
  const adPhone = String(meta.ad_phone || '').trim() || null;
  const adImageUrl = String(meta.ad_image_url || '').trim() || null;
  const subscriptionId = subscription?.id || null;

  const periodStart = subscription?.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString();
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // Reuse an existing directory sponsor for this user when possible.
  let sponsorId = null;
  const { data: existingSponsor } = await admin
    .from('sponsors')
    .select('id')
    .eq('submitted_by', userId)
    .eq('listing_type', 'directory')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSponsor?.id) {
    sponsorId = existingSponsor.id;
    await admin
      .from('sponsors')
      .update({
        business_name: businessName,
        category: categorySlug,
        contact: adPhone,
        image_url: adImageUrl,
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', sponsorId);
  } else {
    const { data: created, error: spErr } = await admin
      .from('sponsors')
      .insert({
        business_name: businessName,
        category: categorySlug,
        contact: adPhone,
        image_url: adImageUrl,
        listing_type: 'directory',
        status: 'approved',
        submitted_by: userId,
        approved_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (spErr) throw spErr;
    sponsorId = created.id;
  }

  // Expire any prior active ad on this slot, then insert.
  await admin
    .from('directory_slot_ads')
    .update({ status: 'expired' })
    .eq('slot_id', slotId)
    .eq('status', 'active');

  const { error: adErr } = await admin.from('directory_slot_ads').insert({
    slot_id: slotId,
    sponsor_id: sponsorId,
    submitted_by: userId,
    category_slug: categorySlug,
    ad_title: adTitle,
    ad_image_url: adImageUrl,
    ad_phone: adPhone,
    period_start: periodStart,
    period_end: periodEnd,
    stripe_subscription_id: subscriptionId,
    status: 'active',
  });
  if (adErr) throw adErr;

  const { error: slotErr } = await admin
    .from('directory_slots')
    .update({ status: 'occupied' })
    .eq('id', slotId);
  if (slotErr) throw slotErr;
  return true;
}

async function releaseDirectorySlot(admin, subscriptionOrMeta) {
  const meta = subscriptionOrMeta?.metadata || subscriptionOrMeta || {};
  if (meta.kind !== 'directory_slot') return false;
  const slotId = meta.slot_id;
  const subscriptionId = subscriptionOrMeta?.id || meta.stripe_subscription_id || null;
  if (!slotId && !subscriptionId) return false;

  if (subscriptionId) {
    await admin
      .from('directory_slot_ads')
      .update({ status: 'expired' })
      .eq('stripe_subscription_id', subscriptionId)
      .eq('status', 'active');
  }

  if (slotId) {
    await admin
      .from('directory_slot_ads')
      .update({ status: 'expired' })
      .eq('slot_id', slotId)
      .eq('status', 'active');
    await admin.from('directory_slots').update({ status: 'available' }).eq('id', slotId);
  } else if (subscriptionId) {
    const { data: ad } = await admin
      .from('directory_slot_ads')
      .select('slot_id')
      .eq('stripe_subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ad?.slot_id) {
      await admin.from('directory_slots').update({ status: 'available' }).eq('id', ad.slot_id);
    }
  }
  return true;
}

async function expireDueDirectoryAds(admin) {
  const now = new Date().toISOString();
  const { data: due, error } = await admin
    .from('directory_slot_ads')
    .select('id,slot_id')
    .eq('status', 'active')
    .lt('period_end', now);
  if (error) throw error;
  for (const ad of due || []) {
    await admin.from('directory_slot_ads').update({ status: 'expired' }).eq('id', ad.id);
    if (ad.slot_id) {
      await admin.from('directory_slots').update({ status: 'available' }).eq('id', ad.slot_id);
    }
  }
  return (due || []).length;
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
        if (session.metadata?.kind === 'directory_slot') {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id;
          let subscription = null;
          if (subscriptionId) {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
          }
          await activateDirectorySlotAd(admin, session.metadata, subscription);
          break;
        }
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
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        if (session.metadata?.kind === 'directory_slot' && session.metadata?.slot_id) {
          await admin
            .from('directory_slots')
            .update({ status: 'available' })
            .eq('id', session.metadata.slot_id);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (subscription.metadata?.kind === 'directory_slot') {
            const periodEnd = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null;
            if (periodEnd) {
              await admin
                .from('directory_slot_ads')
                .update({ period_end: periodEnd, status: 'active' })
                .eq('stripe_subscription_id', subscription.id)
                .eq('status', 'active');
            }
            break;
          }
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
          if (await releaseDirectorySlot(admin, subscription)) break;
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
        if (await releaseDirectorySlot(admin, subscription)) break;
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
        // Opportunistic expiry sweep on any webhook traffic
        await expireDueDirectoryAds(admin);
        break;
    }
  } catch (err) {
    console.error('stripe webhook handler error', err);
    return NextResponse.json({ error: err.message || 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
