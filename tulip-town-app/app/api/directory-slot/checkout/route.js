import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase, getWriteDbFromRequest } from '../../../../lib/apiAuth';
import {
  adBodyLimit,
  normalizeAdImageUrls,
} from '../../../../lib/directoryAdContent';
import { isValidDirectoryCategory } from '../../../../lib/directoryCategories';
import {
  SPECIAL_AD_EXTRA_CENTS,
  SPECIAL_AD_CAPACITY,
  canAddSpecialAd,
  countLiveSpecialAds,
  nextSpecialQueuePosition,
} from '../../../../lib/directorySpecialAds';
import { getAppUrl, getStripe } from '../../../../lib/stripe';

export async function POST(request) {
  try {
    let { user, db } = await getUserFromRequest(request);
    if (!user || !db) {
      const fallback = await getWriteDbFromRequest(request);
      if (fallback.user && fallback.db) {
        user = fallback.user;
        db = fallback.db;
      }
    }
    if (!user || !db) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const slotId = body.slot_id;
    const businessName = String(body.business_name || body.ad_title || '').trim();
    const categorySlug = String(body.category_slug || '').trim();
    const adPhone = String(body.ad_phone || '').trim();
    const adTitle = String(body.ad_title || businessName).trim();
    const adBody = String(body.ad_body || '').trim() || null;
    const imageUrls = normalizeAdImageUrls(body.ad_image_urls, body.ad_image_url);
    const adImageUrl = imageUrls[0] || null;
    const wantSpecial = Boolean(body.is_special);
    const specialImageUrl = String(body.special_image_url || '').trim() || null;

    if (!slotId || !businessName || !adPhone) {
      return NextResponse.json({ error: '슬롯, 업체명, 전화번호는 필수입니다.' }, { status: 400 });
    }
    if (!isValidDirectoryCategory(categorySlug)) {
      return NextResponse.json({ error: '유효한 카테고리를 선택해 주세요.' }, { status: 400 });
    }

    const admin = tryAdminSupabase();
    const reader = admin || db;

    const { data: slot, error: slotErr } = await reader
      .from('directory_slots')
      .select('*')
      .eq('id', slotId)
      .maybeSingle();
    if (slotErr) throw slotErr;
    if (!slot) return NextResponse.json({ error: '슬롯을 찾을 수 없습니다.' }, { status: 404 });
    if (slot.status !== 'available') {
      return NextResponse.json({ error: '이미 판매된 자리입니다.' }, { status: 409 });
    }

    if (wantSpecial && !canAddSpecialAd(slot.size_tier)) {
      return NextResponse.json(
        { error: '소형 슬롯은 첫 페이지 특별광고를 추가할 수 없습니다.' },
        { status: 400 }
      );
    }
    if (wantSpecial && !specialImageUrl) {
      return NextResponse.json(
        { error: '특별광고용 배너 이미지(800×400 권장)를 올려 주세요.' },
        { status: 400 }
      );
    }

    const bodyMax = adBodyLimit(slot.size_tier);
    if (adBody && adBody.length > bodyMax) {
      return NextResponse.json(
        { error: `광고 문구는 ${bodyMax}자 이내로 작성해 주세요.` },
        { status: 400 }
      );
    }

    let specialQueued = false;
    let specialQueuePosition = null;
    if (wantSpecial) {
      try {
        const live = await countLiveSpecialAds(reader);
        if (live >= SPECIAL_AD_CAPACITY) {
          specialQueued = true;
          specialQueuePosition = await nextSpecialQueuePosition(reader);
        }
      } catch (err) {
        // Columns may be missing until SQL migration — still allow checkout without queue.
        console.warn('special capacity check', err.message);
      }
    }

    if (admin) {
      const { data: held, error: holdErr } = await admin
        .from('directory_slots')
        .update({ status: 'occupied' })
        .eq('id', slotId)
        .eq('status', 'available')
        .select('id')
        .maybeSingle();
      if (holdErr) throw holdErr;
      if (!held) {
        return NextResponse.json({ error: '방금 다른 분이 신청한 자리입니다.' }, { status: 409 });
      }
    }

    let pendingAdId = null;
    try {
      const writer = admin || db;
      const draft = {
        slot_id: slotId,
        submitted_by: user.id,
        category_slug: categorySlug,
        ad_title: adTitle,
        ad_phone: adPhone,
        ad_image_url: adImageUrl,
        ad_body: adBody,
        ad_image_urls: imageUrls,
        status: 'pending',
        is_special: wantSpecial,
        special_image_url: wantSpecial ? specialImageUrl : null,
        special_queue_position: wantSpecial ? specialQueuePosition : null,
      };

      let inserted;
      {
        const { data, error } = await writer
          .from('directory_slot_ads')
          .insert(draft)
          .select('id')
          .single();
        if (error) {
          const msg = String(error.message || '');
          if (msg.includes('is_special') || msg.includes('special_')) {
            const { data: withoutSpecial, error: e2 } = await writer
              .from('directory_slot_ads')
              .insert({
                slot_id: slotId,
                submitted_by: user.id,
                category_slug: categorySlug,
                ad_title: adTitle,
                ad_phone: adPhone,
                ad_image_url: adImageUrl,
                ad_body: adBody,
                ad_image_urls: imageUrls,
                status: 'pending',
              })
              .select('id')
              .single();
            if (e2) throw e2;
            inserted = withoutSpecial;
          } else if (msg.includes('ad_body') || msg.includes('ad_image_urls')) {
            const { data: legacy, error: legacyErr } = await writer
              .from('directory_slot_ads')
              .insert({
                slot_id: slotId,
                submitted_by: user.id,
                category_slug: categorySlug,
                ad_title: adTitle,
                ad_phone: adPhone,
                ad_image_url: adImageUrl,
                status: 'pending',
              })
              .select('id')
              .single();
            if (legacyErr) throw legacyErr;
            inserted = legacy;
          } else if (msg.toLowerCase().includes('pending')) {
            inserted = null;
          } else {
            throw error;
          }
        } else {
          inserted = data;
        }
      }
      pendingAdId = inserted?.id || null;

      const stripe = getStripe();
      const appUrl = getAppUrl();
      const baseCents = Number(slot.base_price_cents) || 300;
      const specialCents = wantSpecial ? SPECIAL_AD_EXTRA_CENTS : 0;
      const amountCents = baseCents + specialCents;
      const label = wantSpecial
        ? `지면 광고 ${slot.page_number}면 ${slot.position_label} (${slot.size_tier}) + 특별광고`
        : `지면 광고 ${slot.page_number}면 ${slot.position_label} (${slot.size_tier})`;

      const meta = {
        kind: 'directory_slot',
        slot_id: slotId,
        user_id: user.id,
        business_name: businessName.slice(0, 450),
        ad_title: adTitle.slice(0, 450),
        category_slug: categorySlug,
        ad_phone: adPhone.slice(0, 80),
        ad_image_url: (adImageUrl || '').slice(0, 450),
        ad_body: (adBody || '').slice(0, 450),
        amount_cents: String(amountCents),
        is_special: wantSpecial ? '1' : '0',
        special_image_url: (specialImageUrl || '').slice(0, 450),
        special_queued: specialQueued ? '1' : '0',
        special_queue_position: specialQueuePosition != null ? String(specialQueuePosition) : '',
      };
      if (pendingAdId) meta.pending_ad_id = pendingAdId;

      const lineItems = [
        {
          price_data: {
            currency: 'usd',
            unit_amount: baseCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `지면 광고 ${slot.page_number}면 ${slot.position_label} (${slot.size_tier})`,
            },
          },
          quantity: 1,
        },
      ];
      if (wantSpecial) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            unit_amount: SPECIAL_AD_EXTRA_CENTS,
            recurring: { interval: 'month' },
            product_data: {
              name: specialQueued
                ? '첫 페이지 특별광고 슬라이드 (대기열)'
                : '첫 페이지 특별광고 슬라이드',
            },
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: lineItems,
        success_url: `${appUrl}/directory?checkout=success&session_id={CHECKOUT_SESSION_ID}&page=${slot.page_number}`,
        cancel_url: `${appUrl}/directory/pages/apply?slot=${encodeURIComponent(slotId)}&checkout=cancel`,
        metadata: meta,
        subscription_data: {
          metadata: {
            kind: 'directory_slot',
            slot_id: slotId,
            user_id: user.id,
            is_special: wantSpecial ? '1' : '0',
            ...(pendingAdId ? { pending_ad_id: pendingAdId } : {}),
          },
        },
      });

      return NextResponse.json({
        url: session.url,
        session_id: session.id,
        special_queued: specialQueued,
        amount_cents: amountCents,
        label,
      });
    } catch (err) {
      if (admin) {
        if (pendingAdId) {
          await admin.from('directory_slot_ads').delete().eq('id', pendingAdId);
        }
        await admin.from('directory_slots').update({ status: 'available' }).eq('id', slotId);
      }
      throw err;
    }
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
