import { getTierMeta } from '../lib/memberTier';

/** Compact tier badge for mypage (and later board bylines). */
export default function MemberTierBadge({ tier, className = '' }) {
  const meta = getTierMeta(tier);
  return (
    <span className={`${meta.badgeClass}${className ? ` ${className}` : ''}`} title={meta.labelEn}>
      <span className="tier-badge-dot" aria-hidden="true" />
      <span className="tier-badge-label">{meta.labelKo}</span>
    </span>
  );
}
