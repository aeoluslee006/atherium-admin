/**
 * Activate a directory slot ad without Stripe when member promo is active.
 * Prefers service-role client; works with the caller's JWT client when RLS allows.
 */
export async function activateDirectoryAdForPromo(db, {
  slotId,
  userId,
  pendingAdId,
  businessName,
  adTitle,
  categorySlug,
  adPhone,
  adImageUrl,
  adBody,
  imageUrls,
  wantSpecial,
  specialImageUrl,
  specialQueuePosition,
  promoEndDate,
}) {
  if (!db) {
    throw new Error('게재를 완료할 수 없습니다. 다시 로그인 후 시도해 주세요.');
  }

  const periodStart = new Date().toISOString();
  const periodEnd = promoEndDate
    ? new Date(`${promoEndDate}T23:59:59.000Z`).toISOString()
    : null;

  // Reuse directory sponsor for this user when possible.
  let sponsorId = null;
  const { data: existingSponsor } = await db
    .from('sponsors')
    .select('id')
    .eq('submitted_by', userId)
    .eq('listing_type', 'directory')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSponsor?.id) {
    sponsorId = existingSponsor.id;
    const { error: upSpErr } = await db
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
    if (upSpErr) {
      console.warn('sponsor update', upSpErr.message);
    }
  } else {
    const { data: created, error: spErr } = await db
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

  // Best-effort: expire prior live ads on this slot (may fail under RLS without service role).
  const { error: expireErr } = await db
    .from('directory_slot_ads')
    .update({ status: 'expired' })
    .eq('slot_id', slotId)
    .eq('status', 'active');
  if (expireErr) {
    console.warn('expire prior ads', expireErr.message);
  }

  const activatePatch = {
    sponsor_id: sponsorId,
    period_start: periodStart,
    period_end: periodEnd,
    stripe_subscription_id: null,
    status: 'active',
    category_slug: categorySlug,
    ad_title: adTitle,
    ad_phone: adPhone,
    ad_image_url: adImageUrl,
    is_special: Boolean(wantSpecial),
    special_image_url: wantSpecial ? specialImageUrl : null,
    special_queue_position: wantSpecial ? specialQueuePosition : null,
  };
  if (adBody != null) activatePatch.ad_body = adBody;
  if (imageUrls?.length) activatePatch.ad_image_urls = imageUrls;

  if (pendingAdId) {
    const { data: activated, error: actErr } = await db
      .from('directory_slot_ads')
      .update(activatePatch)
      .eq('id', pendingAdId)
      .eq('submitted_by', userId)
      .select('id')
      .maybeSingle();
    if (actErr) {
      // Retry without special columns if migration missing.
      if (
        String(actErr.message || '').includes('special') ||
        String(actErr.message || '').includes('is_special')
      ) {
        const { error: actErr2 } = await db
          .from('directory_slot_ads')
          .update({
            sponsor_id: sponsorId,
            period_start: periodStart,
            period_end: periodEnd,
            stripe_subscription_id: null,
            status: 'active',
            category_slug: categorySlug,
            ad_title: adTitle,
            ad_phone: adPhone,
            ad_image_url: adImageUrl,
            ...(adBody != null ? { ad_body: adBody } : {}),
          })
          .eq('id', pendingAdId)
          .eq('submitted_by', userId);
        if (actErr2) throw actErr2;
      } else {
        throw actErr;
      }
    } else if (!activated?.id) {
      pendingAdId = null;
    }
  }

  if (!pendingAdId) {
    const insertRow = {
      slot_id: slotId,
      sponsor_id: sponsorId,
      submitted_by: userId,
      category_slug: categorySlug,
      ad_title: adTitle,
      ad_image_url: adImageUrl,
      ad_phone: adPhone,
      period_start: periodStart,
      period_end: periodEnd,
      stripe_subscription_id: null,
      status: 'active',
      is_special: Boolean(wantSpecial),
      special_image_url: wantSpecial ? specialImageUrl : null,
      special_queue_position: wantSpecial ? specialQueuePosition : null,
    };
    if (adBody) insertRow.ad_body = adBody;
    if (imageUrls?.length) insertRow.ad_image_urls = imageUrls;
    const { error: adErr } = await db.from('directory_slot_ads').insert(insertRow);
    if (adErr) throw adErr;
  }

  const { error: slotErr } = await db
    .from('directory_slots')
    .update({ status: 'occupied' })
    .eq('id', slotId)
    .eq('status', 'available');
  if (slotErr) {
    // Slot may already be held by service-role path, or RLS may block — try without status filter.
    const { error: slotErr2 } = await db
      .from('directory_slots')
      .update({ status: 'occupied' })
      .eq('id', slotId);
    if (slotErr2) {
      console.warn('slot occupy', slotErr2.message);
      throw new Error(
        '프로모션 게재 중 자리 확정에 실패했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.'
      );
    }
  }

  return { period_start: periodStart, period_end: periodEnd, sponsor_id: sponsorId };
}
