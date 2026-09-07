import { drainSpecialQueue } from './directorySpecialAds';
import {
  DEFAULT_PROMO_DAYS,
  MEMBER_STATUS,
  datePlusDays,
  resolveMemberStatus,
} from './memberStatus';
import { getStripe, isStripeConfigured } from './stripe';

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

/** Collect Stripe subscription ids owned by this member. */
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

/**
 * Hide member paid directory ads, free slots, clear special + drain queue.
 * Same for hold and soft-delete.
 */
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

/**
 * Apply hold / unhold / soft-delete. status is sole write target.
 */
export async function applyMemberStatusChange(db, {
  actorId,
  targetId,
  nextStatus,
  promoEndDate,
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

  // Promo-only update
  if (promoEndDate !== undefined && nextStatus === undefined) {
    const patch = {
      promo_end_date: promoEndDate || null,
    };
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
      detail: { before: before.promo_end_date, after: patch.promo_end_date },
    });
    result.promo = data.promo_end_date;
    result.nextStatus = resolveMemberStatus(data);
    return { member: data, ...result };
  }

  if (!nextStatus || !Object.values(MEMBER_STATUS).includes(nextStatus)) {
    throw new Error('유효한 status가 필요합니다.');
  }

  const patch = { status: nextStatus };
  if (promoEndDate !== undefined) {
    patch.promo_end_date = promoEndDate || null;
  }

  // Do not write legacy columns (read-only compat)

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
    // Special ads / listings are NOT auto-restored after hold (must re-apply)
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
      before: { status: prevStatus, promo_end_date: before.promo_end_date },
      after: { status: data.status, promo_end_date: data.promo_end_date },
      stripe: result.stripe,
      content: result.content,
    },
  });

  result.nextStatus = resolveMemberStatus(data);
  return { member: data, ...result };
}

export async function ensureFirstPaidPromo(db, profileId) {
  const { data: profile, error } = await db
    .from('profiles')
    .select('id,promo_end_date,status')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error('프로필을 찾을 수 없습니다.');

  if (profile.promo_end_date) {
    return { promo_end_date: profile.promo_end_date, granted: false };
  }

  const promo_end_date = datePlusDays(DEFAULT_PROMO_DAYS);
  const { error: upErr } = await db
    .from('profiles')
    .update({ promo_end_date })
    .eq('id', profileId)
    .is('promo_end_date', null);
  if (upErr) throw upErr;

  return { promo_end_date, granted: true };
}
