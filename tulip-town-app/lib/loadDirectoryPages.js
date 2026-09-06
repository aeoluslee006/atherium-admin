import { groupSlotsByPage } from './directorySlots';
import { supabaseRest } from './supabaseRest';

export async function loadDirectoryPages() {
  let slots = [];
  try {
    const rows = await supabaseRest(
      'directory_slots?select=id,page_number,row_index,col_index,span_cols,span_rows,position_label,size_tier,base_price_cents,status,directory_slot_ads(id,slot_id,category_slug,ad_title,ad_image_url,ad_phone,status,period_end)&order=page_number.asc,row_index.asc,col_index.asc'
    );
    slots = Array.isArray(rows) ? rows : [];
  } catch {
    try {
      const rawSlots = await supabaseRest(
        'directory_slots?select=*&order=page_number.asc,row_index.asc,col_index.asc'
      );
      const ads = await supabaseRest('directory_slot_ads?select=*&status=eq.active');
      const adBySlot = new Map();
      for (const ad of Array.isArray(ads) ? ads : []) {
        if (!adBySlot.has(ad.slot_id)) adBySlot.set(ad.slot_id, []);
        adBySlot.get(ad.slot_id).push(ad);
      }
      slots = (Array.isArray(rawSlots) ? rawSlots : []).map((s) => ({
        ...s,
        directory_slot_ads: adBySlot.get(s.id) || [],
      }));
    } catch {
      slots = [];
    }
  }

  const normalized = slots.map((s) => {
    let ads = s.directory_slot_ads;
    if (ads && !Array.isArray(ads)) ads = [ads];
    if (Array.isArray(ads)) {
      ads = ads.filter((a) => a && a.status === 'active');
    }
    return { ...s, directory_slot_ads: ads || [] };
  });

  return groupSlotsByPage(normalized);
}
