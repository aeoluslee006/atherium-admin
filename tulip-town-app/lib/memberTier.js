/** Member tier helpers (phase 1 — computed, not stored). */

export const TIER = {
  SUPER_ADMIN: 'super_admin',
  BLACK: 'black',
  DIAMOND: 'diamond',
  GOLD: 'gold',
  SILVER: 'silver',
  BRONZE: 'bronze',
};

export const TIER_META = {
  super_admin: {
    id: 'super_admin',
    labelKo: '관리자',
    labelEn: 'Admin',
    badgeClass: 'tier-badge tier-badge--admin',
  },
  black: {
    id: 'black',
    labelKo: '운영진',
    labelEn: 'Moderator',
    badgeClass: 'tier-badge tier-badge--black',
  },
  diamond: {
    id: 'diamond',
    labelKo: '다이아몬드',
    labelEn: 'Diamond',
    badgeClass: 'tier-badge tier-badge--diamond',
  },
  gold: {
    id: 'gold',
    labelKo: '골드',
    labelEn: 'Gold',
    badgeClass: 'tier-badge tier-badge--gold',
  },
  silver: {
    id: 'silver',
    labelKo: '실버',
    labelEn: 'Silver',
    badgeClass: 'tier-badge tier-badge--silver',
  },
  bronze: {
    id: 'bronze',
    labelKo: '브론즈',
    labelEn: 'Bronze',
    badgeClass: 'tier-badge tier-badge--bronze',
  },
};

export const PRODUCT_LABELS = {
  tulip_shop: '튤립가게',
  directory_listing: '업체 디렉토리',
};

export const STATUS_LABELS = {
  active: '이용 중',
  expired: '만료',
  canceled: '해지',
};

/**
 * Resolve tier from profile + subscriptions (same rules as member_tier_view).
 * Priority: is_admin → is_moderator → diamond → gold → silver → bronze
 */
export function resolveMemberTier(profile, subscriptions = []) {
  if (!profile) return TIER.BRONZE;
  if (profile.is_admin) return TIER.SUPER_ADMIN;
  if (profile.is_moderator) return TIER.BLACK;

  const active = (subscriptions || []).filter((s) => s.status === 'active');
  const accountType = profile.account_type || 'individual';

  if (
    accountType === 'business' &&
    active.some((s) => s.product_type === 'tulip_shop' || s.product_type === 'directory_listing')
  ) {
    return TIER.DIAMOND;
  }

  if (accountType === 'individual' && active.some((s) => s.product_type === 'tulip_shop')) {
    return TIER.GOLD;
  }

  const postCount = Number(profile.post_count || 0);
  const lastPostAt = profile.last_post_at ? new Date(profile.last_post_at) : null;
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  if (postCount >= 10 && lastPostAt && lastPostAt.getTime() >= ninetyDaysAgo) {
    return TIER.SILVER;
  }

  return TIER.BRONZE;
}

export function getTierMeta(tierId) {
  return TIER_META[tierId] || TIER_META.bronze;
}

export function formatJoinedDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function displayNameFromProfile(profile, email) {
  if (!profile) return email || '회원';
  return (
    profile.display_name ||
    profile.username ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    email ||
    '회원'
  );
}
