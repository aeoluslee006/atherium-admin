import { TIER, formatMembershipMonths } from './memberTier';
import { supabaseRest } from './supabaseRest';

/** Load member_tier_view + profiles.created_at for a shop sponsor. */
export async function loadSellerTrust(seller) {
  const profileId = seller?.submitted_by;
  if (!profileId) {
    return { tier: TIER.BRONZE, tenureLabel: null };
  }

  let tier = TIER.BRONZE;
  let createdAt = null;

  try {
    const rows = await supabaseRest(
      `member_tier_view?select=profile_id,tier&profile_id=eq.${encodeURIComponent(profileId)}&limit=1`
    );
    if (Array.isArray(rows) && rows[0]?.tier) {
      tier = rows[0].tier;
    }
  } catch {
    // fall back to bronze
  }

  try {
    const rows = await supabaseRest(
      `profiles?select=id,created_at&id=eq.${encodeURIComponent(profileId)}&limit=1`
    );
    createdAt = Array.isArray(rows) ? rows[0]?.created_at || null : null;
  } catch {
    // tenure optional
  }

  return {
    tier,
    tenureLabel: formatMembershipMonths(createdAt),
  };
}
