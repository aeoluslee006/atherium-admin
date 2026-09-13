import { NextResponse } from 'next/server';
import { tryAdminSupabase } from '../../../lib/apiAuth';
import { supabaseRest } from '../../../lib/supabaseRest';
import {
  SPECIAL_AD_CAPACITY,
  SPECIAL_AD_EXTRA_CENTS,
  countLiveSpecialAds,
} from '../../../lib/directorySpecialAds';

/** Public status for apply form + slider. */
export async function GET() {
  try {
    const admin = tryAdminSupabase();
    let liveCount = 0;
    let ads = [];

    if (admin) {
      liveCount = await countLiveSpecialAds(admin);
      const { data, error } = await admin
        .from('directory_slot_ads')
        .select(
          'id,ad_title,ad_phone,special_image_url,category_slug,directory_slots(page_number,position_label,size_tier)'
        )
        .eq('status', 'active')
        .eq('is_special', true)
        .is('special_queue_position', null)
        .order('created_at', { ascending: true })
        .limit(SPECIAL_AD_CAPACITY);
      if (error) throw error;
      ads = data || [];
    } else {
      try {
        const rows = await supabaseRest(
          `directory_slot_ads?select=id,ad_title,ad_phone,special_image_url,category_slug,directory_slots(page_number,position_label,size_tier)&status=eq.active&is_special=eq.true&special_queue_position=is.null&order=created_at.asc&limit=${SPECIAL_AD_CAPACITY}`
        );
        ads = Array.isArray(rows) ? rows : [];
        liveCount = ads.length;
      } catch {
        ads = [];
        liveCount = 0;
      }
    }

    return NextResponse.json({
      capacity: SPECIAL_AD_CAPACITY,
      liveCount,
      full: liveCount >= SPECIAL_AD_CAPACITY,
      extraCents: SPECIAL_AD_EXTRA_CENTS,
      ads,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
