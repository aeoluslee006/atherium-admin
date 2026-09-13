/** pricing_settings keys for tulip-town paid sections. */

export const PRICING_KEYS = {
  directory_small: { key: 'directory_small', label: '지면 소형 (월)', defaultCents: 300 },
  directory_medium: { key: 'directory_medium', label: '지면 중형 (월)', defaultCents: 500 },
  directory_large: { key: 'directory_large', label: '지면 대형 (월)', defaultCents: 900 },
  directory_ultra: { key: 'directory_ultra', label: '지면 울트라 (월)', defaultCents: 1800 },
  special_ad_addon: { key: 'special_ad_addon', label: '첫 페이지 특별광고 추가 (월)', defaultCents: 200 },
};

export function directoryPriceKey(sizeTier) {
  const tier = String(sizeTier || '').toLowerCase();
  if (tier === 'small' || tier === 'medium' || tier === 'large' || tier === 'ultra') {
    return `directory_${tier}`;
  }
  return null;
}

export async function getPricingAmountCents(db, key, fallbackCents) {
  if (!db || !key) return fallbackCents;
  try {
    const { data, error } = await db
      .from('pricing_settings')
      .select('amount_cents,is_active')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.is_active === false) return fallbackCents;
    const n = Number(data.amount_cents);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallbackCents;
  } catch {
    return fallbackCents;
  }
}
