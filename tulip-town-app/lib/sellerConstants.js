/** Tulip shop (sponsors listing_type=shop + products). */

export const SHOP_BASIC_PRODUCT_LIMIT = 6;
export const SHOP_EXTENDED_PRODUCT_LIMIT = 30;
export const SHOP_BASIC_PLAN = 'basic';
export const SHOP_EXTENDED_PLAN = 'extended';

export const SHOP_MONTHLY_KEY = 'shop_monthly';
export const SHOP_UPGRADE_MONTHLY_KEY = 'shop_upgrade_monthly';

export const SELLER_CITIES = ['Holland', 'Grand Rapids', 'Zeeland', 'Hudsonville', 'Other'];

export const SELLER_STATUS_LABEL = {
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '거절됨',
  suspended: '정지',
};

export const SUB_STATUS_LABEL = {
  none: '미구독',
  pending: '결제 대기',
  active: '구독 중',
  past_due: '연체',
  canceled: '해지',
};

/** Legacy gift-seller constants (kept for /gift flows). */
export const SELLER_PRODUCT_LIMIT = 30;
export const SELLER_FEE_PERCENT = 2;
export const SELLER_PLAN_KEY = 'seller_monthly';

export const EIN_PATTERN = /^\d{2}-\d{7}$/;

export function isValidEin(value) {
  return EIN_PATTERN.test(String(value || '').trim());
}

export function formatPriceCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '';
  return `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}`;
}

/** Approved shop seller may list products immediately (billing is separate). */
export function canManageShopProducts(sponsor) {
  return Boolean(sponsor && sponsor.listing_type === 'shop' && sponsor.status === 'approved');
}

export function shopProductLimit(sponsor) {
  const limit = Number(sponsor?.product_limit);
  if (Number.isFinite(limit) && limit > 0) return limit;
  return sponsor?.plan_tier === SHOP_EXTENDED_PLAN
    ? SHOP_EXTENDED_PRODUCT_LIMIT
    : SHOP_BASIC_PRODUCT_LIMIT;
}

export function canManageProducts(seller) {
  return (
    seller &&
    seller.status === 'approved' &&
    seller.subscription_status === 'active'
  );
}

export function canAcceptOrders(seller) {
  return canManageProducts(seller) && seller.charges_enabled === true;
}

export function feeCentsFromAmount(amountCents, percent = SELLER_FEE_PERCENT) {
  return Math.round((Number(amountCents) || 0) * (percent / 100));
}
