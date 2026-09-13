import { createAdminSupabase } from './supabaseAdmin';

/**
 * Count favorites per product for popularity badges.
 * Uses service role when available; returns {} on failure/missing key.
 */
export async function loadFavoriteCountsByProductId(productIds = []) {
  const ids = [...new Set((productIds || []).map(String).filter(Boolean))];
  if (!ids.length) return {};

  try {
    const db = createAdminSupabase();
    const { data, error } = await db
      .from('product_favorites')
      .select('product_id')
      .in('product_id', ids);
    if (error || !Array.isArray(data)) return {};

    const counts = {};
    for (const row of data) {
      const id = row?.product_id;
      if (!id) continue;
      counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}
