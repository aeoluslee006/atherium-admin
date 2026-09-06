import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import {
  adBodyLimit,
  normalizeAdImageUrls,
} from '../../../../lib/directoryAdContent';
import { isValidDirectoryCategory } from '../../../../lib/directoryCategories';

const AD_SELECT =
  'id,slot_id,sponsor_id,submitted_by,category_slug,ad_title,ad_body,ad_image_url,ad_image_urls,ad_phone,status,period_end,directory_slots(id,page_number,position_label,size_tier,base_price_cents,status)';

async function loadOwnedAd(reader, adId, userId) {
  let { data, error } = await reader
    .from('directory_slot_ads')
    .select(AD_SELECT)
    .eq('id', adId)
    .maybeSingle();

  if (error && (String(error.message || '').includes('ad_body') || String(error.message || '').includes('ad_image_urls'))) {
    const legacy = await reader
      .from('directory_slot_ads')
      .select(
        'id,slot_id,sponsor_id,submitted_by,category_slug,ad_title,ad_image_url,ad_phone,status,period_end,directory_slots(id,page_number,position_label,size_tier,base_price_cents,status)'
      )
      .eq('id', adId)
      .maybeSingle();
    data = legacy.data;
    error = legacy.error;
  }
  if (error) throw error;
  if (!data) return { error: '광고를 찾을 수 없습니다.', status: 404 };
  if (data.submitted_by !== userId) {
    return { error: '본인이 올린 광고만 수정할 수 있습니다.', status: 403 };
  }
  if (data.status !== 'active') {
    return { error: '활성 광고만 수정할 수 있습니다.', status: 400 };
  }
  return { ad: data };
}

export async function GET(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const adId = request.nextUrl.searchParams.get('id') || '';
    if (!adId) {
      return NextResponse.json({ error: '광고 id가 필요합니다.' }, { status: 400 });
    }

    const admin = tryAdminSupabase();
    const reader = admin || db;
    const result = await loadOwnedAd(reader, adId, user.id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ad: result.ad, slot: result.ad.directory_slots || null });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const adId = String(body.id || body.ad_id || '').trim();
    if (!adId) {
      return NextResponse.json({ error: '광고 id가 필요합니다.' }, { status: 400 });
    }

    const admin = tryAdminSupabase();
    const reader = admin || db;
    const owned = await loadOwnedAd(reader, adId, user.id);
    if (owned.error) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }

    const sizeTier = owned.ad?.directory_slots?.size_tier || 'small';
    const patch = {};
    if ('ad_title' in body || 'business_name' in body) {
      const title = String(body.ad_title || body.business_name || '').trim();
      if (!title) {
        return NextResponse.json({ error: '업체명을 입력해 주세요.' }, { status: 400 });
      }
      patch.ad_title = title;
    }
    if ('category_slug' in body) {
      const categorySlug = String(body.category_slug || '').trim();
      if (!isValidDirectoryCategory(categorySlug)) {
        return NextResponse.json({ error: '유효한 카테고리를 선택해 주세요.' }, { status: 400 });
      }
      patch.category_slug = categorySlug;
    }
    if ('ad_phone' in body) {
      const phone = String(body.ad_phone || '').trim();
      if (!phone) {
        return NextResponse.json({ error: '전화번호를 입력해 주세요.' }, { status: 400 });
      }
      patch.ad_phone = phone;
    }
    if ('ad_body' in body) {
      const text = String(body.ad_body || '').trim();
      const max = adBodyLimit(sizeTier);
      if (text.length > max) {
        return NextResponse.json({ error: `광고 문구는 ${max}자 이내로 작성해 주세요.` }, { status: 400 });
      }
      patch.ad_body = text || null;
    }
    if ('ad_image_urls' in body || 'ad_image_url' in body) {
      const urls = normalizeAdImageUrls(body.ad_image_urls, body.ad_image_url);
      patch.ad_image_urls = urls;
      patch.ad_image_url = urls[0] || null;
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 });
    }

    const writer = admin || db;
    let { data, error } = await writer
      .from('directory_slot_ads')
      .update(patch)
      .eq('id', adId)
      .eq('submitted_by', user.id)
      .eq('status', 'active')
      .select(
        'id,slot_id,sponsor_id,submitted_by,category_slug,ad_title,ad_body,ad_image_url,ad_image_urls,ad_phone,status,period_end'
      )
      .single();

    if (error) {
      // Fallback without new columns
      const legacyPatch = { ...patch };
      delete legacyPatch.ad_body;
      delete legacyPatch.ad_image_urls;
      const retry = await (admin || writer)
        .from('directory_slot_ads')
        .update(legacyPatch)
        .eq('id', adId)
        .eq('submitted_by', user.id)
        .eq('status', 'active')
        .select(
          'id,slot_id,sponsor_id,submitted_by,category_slug,ad_title,ad_image_url,ad_phone,status,period_end'
        )
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
    }

    if (data?.sponsor_id && (patch.ad_title || patch.ad_phone || patch.ad_image_url || patch.category_slug)) {
      const sponsorPatch = {};
      if (patch.ad_title) sponsorPatch.business_name = patch.ad_title;
      if (patch.ad_phone) sponsorPatch.contact = patch.ad_phone;
      if ('ad_image_url' in patch) sponsorPatch.image_url = patch.ad_image_url;
      if (patch.category_slug) sponsorPatch.category = patch.category_slug;
      if (Object.keys(sponsorPatch).length) {
        await writer.from('sponsors').update(sponsorPatch).eq('id', data.sponsor_id);
      }
    }

    return NextResponse.json({ ad: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
