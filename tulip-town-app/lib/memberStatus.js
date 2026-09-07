/** Profile account status — source of truth for hold/delete. */

export const MEMBER_STATUS = {
  ACTIVE: 'active',
  HOLD: 'hold',
  DELETED: 'deleted',
};

export const MEMBER_STATUS_LABELS = {
  active: '정상',
  hold: '홀드',
  deleted: '삭제됨',
};

export const DEFAULT_PROMO_DAYS = 20;

/** Normalize status; ignore legacy ban/suspend for write decisions. */
export function resolveMemberStatus(profile) {
  const raw = String(profile?.status || '').toLowerCase();
  if (raw === MEMBER_STATUS.HOLD || raw === MEMBER_STATUS.DELETED || raw === MEMBER_STATUS.ACTIVE) {
    return raw;
  }
  // Legacy read-only fallback for rows not yet migrated
  if (profile?.is_banned) return MEMBER_STATUS.DELETED;
  if (profile?.suspended_until && new Date(profile.suspended_until).getTime() > Date.now()) {
    return MEMBER_STATUS.HOLD;
  }
  return MEMBER_STATUS.ACTIVE;
}

export function isLoginBlocked(profile) {
  return resolveMemberStatus(profile) === MEMBER_STATUS.DELETED;
}

export function isContentHiddenForOwner(profileOrStatus) {
  const status =
    typeof profileOrStatus === 'string'
      ? profileOrStatus
      : resolveMemberStatus(profileOrStatus);
  return status === MEMBER_STATUS.HOLD || status === MEMBER_STATUS.DELETED;
}

export function isWriteBlockedByStatus(profile) {
  const status = resolveMemberStatus(profile);
  if (status === MEMBER_STATUS.DELETED) {
    return { blocked: true, reason: '삭제된 계정입니다. 로그인이 제한됩니다.' };
  }
  if (status === MEMBER_STATUS.HOLD) {
    return {
      blocked: true,
      reason: '계정이 홀드 상태입니다. 새 글 작성 및 유료 신청이 제한됩니다.',
    };
  }
  return { blocked: false, reason: '' };
}

export function promoLabel(promoEndDate, now = new Date()) {
  if (!promoEndDate) return '미적용';
  const end = new Date(`${promoEndDate}T23:59:59`);
  if (Number.isNaN(end.getTime())) return '미적용';
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return '만료';
  if (diffDays === 0) return 'D-0';
  return `D-${diffDays}`;
}

export function isPromoActive(promoEndDate, now = new Date()) {
  if (!promoEndDate) return false;
  const end = new Date(`${promoEndDate}T23:59:59`);
  return !Number.isNaN(end.getTime()) && end.getTime() >= now.getTime();
}

/** YYYY-MM-DD for today + days (UTC date string for Postgres date). */
export function datePlusDays(days, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

/** Unix timestamp for Stripe trial_end (end of promo day, min +1 day from now). */
export function promoTrialEndUnix(promoEndDate) {
  if (!promoEndDate) return null;
  const end = new Date(`${promoEndDate}T23:59:59Z`);
  const min = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const ts = Math.floor(end.getTime() / 1000);
  if (!Number.isFinite(ts) || ts < min) return null;
  return ts;
}
