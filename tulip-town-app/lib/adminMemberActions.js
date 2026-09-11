import { drainSpecialQueue } from './directorySpecialAds';
import {
  DEFAULT_PROMO_DAYS,
  MEMBER_STATUS,
  datePlusDays,
  isPromoActive,
  promoTrialEndUnix,
  resolveMemberStatus,
} from './memberStatus';
import { getStripe, isStripeConfigured } from './stripe';

export const PROMO_PRODUCT = {
  DIRECTORY: 'directory_listing',
  TULIP_SHOP: 'tulip_shop',
};

export const PROMO_DEFAULT_DAYS = {
  directory_listing: 20,
  tulip_shop: 30,
};

async function logAction(db, { actorId, targetId, action, detail }) {
  try {
    await db.from('admin_action_log').insert({
      actor_id: actorId || null,
      target_profile_id: targetId || null,
      action,
      detail: detail || null,
    });
  } catch (err) {
    console.warn('admin_action_log insert', err.message);
  }
}

export async function getMemberPromo(db, profileId, productKey) {
  const { data, error } = await db
    .from('member_promotions')
    .select('promo_end_date, price_cents_override')
    .eq('profile_id', profileId)
    .eq('product_key', productKey)
    .maybeSingle();
  if (error) {
    // Fallback to legacy profiles.promo_end_date for directory only
    // (price override requires member_promotions.price_cents_override column)
    if (productKey === PROMO_PRODUCT.DIRECTORY) {
      const { data: profile } = await db
        .from('profiles')
        .select('promo_end_date')
        .eq('id', profileId)
        .maybeSingle();
      return {
        promo_end_date: profile?.promo_end_date || null,
        price_cents_override: null,
      };
    }
    // Column may be missing before SQL patch — retry without override.
    if (String(error.message || '').includes('price_cents_override')) {
      const { data: row, error: err2 } = await db
        .from('member_promotions')
        .select('promo_end_date')
        .eq('profile_id', profileId)
        .eq('product_key', productKey)
        .maybeSingle();
      if (err2) throw err2;
      return {
        promo_end_date: row?.promo_end_date || null,
        price_cents_override: null,
      };
    }
    throw error;
  }
  const override =
    data?.price_cents_override == null || data?.price_cents_override === ''
      ? null
      : Number(data.price_cents_override);
  return {
    promo_end_date: data?.promo_end_date || null,
    price_cents_override: Number.isFinite(override) ? Math.round(override) : null,
  };
}

export async function getMemberPromoEndDate(db, profileId, productKey) {
  const row = await getMemberPromo(db, profileId, productKey);
  return row.promo_end_date || null;
}

/**
 * On first paid checkout for a product: grant default promo days if none set.
 */
export async function ensureFirstPaidPromo(db, profileId, productKey = PROMO_PRODUCT.DIRECTORY) {
  const existing = await getMemberPromoEndDate(db, profileId, productKey);
  if (existing) {
    return { promo_end_date: existing, granted: false };
  }

  const days = PROMO_DEFAULT_DAYS[productKey] || DEFAULT_PROMO_DAYS;
  const promo_end_date = datePlusDays(days);

  const { error } = await db.from('member_promotions').upsert(
    {
      profile_id: profileId,
      product_key: productKey,
      promo_end_date,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id,product_key' }
  );

  if (error) {
    // Legacy fallback
    if (productKey === PROMO_PRODUCT.DIRECTORY) {
      const { error: upErr } = await db
        .from('profiles')
        .update({ promo_end_date })
        .eq('id', profileId)
        .is('promo_end_date', null);
      if (upErr) throw upErr;
      return { promo_end_date, granted: true };
    }
    throw error;
  }

  return { promo_end_date, granted: true };
}

export function trialEndForPromo(promoEndDate) {
  if (!isPromoActive(promoEndDate)) return null;
  return promoTrialEndUnix(promoEndDate);
}

export async function collectMemberSubscriptionIds(db, profileId) {
  const ids = new Set();

  const { data: ads } = await db
    .from('directory_slot_ads')
    .select('stripe_subscription_id')
    .eq('submitted_by', profileId)
    .not('stripe_subscription_id', 'is', null);
  for (const row of ads || []) {
    if (row.stripe_subscription_id) ids.add(row.stripe_subscription_id);
  }

  const { data: subs } = await db
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('profile_id', profileId)
    .not('stripe_subscription_id', 'is', null);
  for (const row of subs || []) {
    if (row.stripe_subscription_id) ids.add(row.stripe_subscription_id);
  }

  const { data: sponsors } = await db
    .from('sponsors')
    .select('stripe_subscription_id,submitted_by')
    .eq('submitted_by', profileId)
    .not('stripe_subscription_id', 'is', null);
  for (const row of sponsors || []) {
    if (row.stripe_subscription_id) ids.add(row.stripe_subscription_id);
  }

  return [...ids];
}

async function pauseStripeSubs(subscriptionIds) {
  if (!isStripeConfigured() || !subscriptionIds.length) return { ok: [], failed: [] };
  const stripe = getStripe();
  const ok = [];
  const failed = [];
  for (const id of subscriptionIds) {
    try {
      await stripe.subscriptions.update(id, {
        pause_collection: { behavior: 'mark_uncollectible' },
      });
      ok.push(id);
    } catch (err) {
      console.warn('stripe pause', id, err.message);
      failed.push({ id, error: err.message });
    }
  }
  return { ok, failed };
}

async function resumeStripeSubs(subscriptionIds) {
  if (!isStripeConfigured() || !subscriptionIds.length) return { ok: [], failed: [] };
  const stripe = getStripe();
  const ok = [];
  const failed = [];
  for (const id of subscriptionIds) {
    try {
      await stripe.subscriptions.update(id, { pause_collection: '' });
      ok.push(id);
    } catch (err) {
      console.warn('stripe resume', id, err.message);
      failed.push({ id, error: err.message });
    }
  }
  return { ok, failed };
}

async function cancelStripeSubs(subscriptionIds) {
  if (!isStripeConfigured() || !subscriptionIds.length) return { ok: [], failed: [] };
  const stripe = getStripe();
  const ok = [];
  const failed = [];
  for (const id of subscriptionIds) {
    try {
      await stripe.subscriptions.cancel(id);
      ok.push(id);
    } catch (err) {
      console.warn('stripe cancel', id, err.message);
      failed.push({ id, error: err.message });
    }
  }
  return { ok, failed };
}

export async function hideMemberPaidContent(db, profileId) {
  const { data: ads, error } = await db
    .from('directory_slot_ads')
    .select('id,slot_id,is_special,special_queue_position,status')
    .eq('submitted_by', profileId)
    .eq('status', 'active');
  if (error) throw error;

  const slotIds = [];
  for (const ad of ads || []) {
    const { error: upErr } = await db
      .from('directory_slot_ads')
      .update({
        status: 'expired',
        is_special: false,
        special_queue_position: null,
      })
      .eq('id', ad.id);
    if (upErr) {
      await db.from('directory_slot_ads').update({ status: 'expired' }).eq('id', ad.id);
    }
    if (ad.slot_id) slotIds.push(ad.slot_id);
  }

  for (const slotId of [...new Set(slotIds)]) {
    await db.from('directory_slots').update({ status: 'available' }).eq('id', slotId);
  }

  let promoted = [];
  try {
    promoted = await drainSpecialQueue(db);
  } catch (err) {
    console.warn('drainSpecialQueue after hide', err.message);
  }

  return { expiredAds: (ads || []).length, freedSlots: slotIds.length, promoted };
}

export async function applyMemberStatusChange(db, {
  actorId,
  targetId,
  nextStatus,
  promoEndDate,
  productKey,
}) {
  const { data: before, error: beforeErr } = await db
    .from('profiles')
    .select('id,status,promo_end_date,is_admin,display_name,email')
    .eq('id', targetId)
    .maybeSingle();
  if (beforeErr) throw beforeErr;
  if (!before) throw new Error('회원을 찾을 수 없습니다.');
  if (before.is_admin) throw new Error('다른 관리자 계정은 변경할 수 없습니다.');

  const prevStatus = resolveMemberStatus(before);
  const result = { prevStatus, nextStatus: prevStatus, stripe: null, content: null, promo: null };

  // Per-product promo update
  if (productKey && promoEndDate !== undefined && nextStatus === undefined) {
    const { error } = await db.from('member_promotions').upsert(
      {
        profile_id: targetId,
        product_key: productKey,
        promo_end_date: promoEndDate || null,
        updated_by: actorId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,product_key' }
    );
    if (error) throw error;
    await logAction(db, {
      actorId,
      targetId,
      action: 'promo_update',
      detail: { product_key: productKey, after: promoEndDate || null },
    });
    result.promo = { product_key: productKey, promo_end_date: promoEndDate || null };
    return { member: before, ...result };
  }

  // Legacy single promo on profiles (compat)
  if (promoEndDate !== undefined && nextStatus === undefined && !productKey) {
    const patch = { promo_end_date: promoEndDate || null };
    const { data, error } = await db
      .from('profiles')
      .update(patch)
      .eq('id', targetId)
      .select('id,status,promo_end_date,display_name,email')
      .single();
    if (error) throw error;
    await logAction(db, {
      actorId,
      targetId,
      action: 'promo_update',
      detail: { before: before.promo_end_date, after: patch.promo_end_date, legacy: true },
    });
    result.promo = data.promo_end_date;
    result.nextStatus = resolveMemberStatus(data);
    return { member: data, ...result };
  }

  if (!nextStatus || !Object.values(MEMBER_STATUS).includes(nextStatus)) {
    throw new Error('유효한 status가 필요합니다.');
  }

  const patch = { status: nextStatus };

  if (nextStatus === MEMBER_STATUS.HOLD || nextStatus === MEMBER_STATUS.DELETED) {
    result.content = await hideMemberPaidContent(db, targetId);
    const subIds = await collectMemberSubscriptionIds(db, targetId);
    if (nextStatus === MEMBER_STATUS.HOLD) {
      result.stripe = { action: 'pause', ...(await pauseStripeSubs(subIds)) };
    } else {
      result.stripe = { action: 'cancel', ...(await cancelStripeSubs(subIds)) };
      await db
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('profile_id', targetId)
        .eq('status', 'active');
    }
  }

  if (nextStatus === MEMBER_STATUS.ACTIVE && prevStatus === MEMBER_STATUS.HOLD) {
    const subIds = await collectMemberSubscriptionIds(db, targetId);
    result.stripe = { action: 'resume', ...(await resumeStripeSubs(subIds)) };
  }

  const { data, error } = await db
    .from('profiles')
    .update(patch)
    .eq('id', targetId)
    .select('id,status,promo_end_date,display_name,email,created_at')
    .single();
  if (error) throw error;

  const action =
    nextStatus === MEMBER_STATUS.HOLD
      ? 'hold'
      : nextStatus === MEMBER_STATUS.DELETED
        ? 'soft_delete'
        : prevStatus === MEMBER_STATUS.HOLD
          ? 'unhold'
          : 'status_update';

  await logAction(db, {
    actorId,
    targetId,
    action,
    detail: {
      before: { status: prevStatus },
      after: { status: data.status },
      stripe: result.stripe,
      content: result.content,
    },
  });

  result.nextStatus = resolveMemberStatus(data);
  return { member: data, ...result };
}
