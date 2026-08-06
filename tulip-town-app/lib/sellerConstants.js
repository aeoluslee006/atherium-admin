export const SELLER_PRODUCT_LIMIT = 30;
export const SELLER_FEE_PERCENT = 2;
export const SELLER_PLAN_KEY = 'seller_monthly';

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

/** Required fields for seller application (individuals OK — no business license required). */
export const SELLER_APPLY_FIELDS = [
  { key: 'shop_name', label: '상점명', required: true, hint: '튤립가게에 보여질 이름' },
  { key: 'contact_name', label: '이름(담당자)', required: true, hint: '개인이면 본명' },
  { key: 'phone', label: '휴대폰', required: true },
  { key: 'email', label: '이메일', required: true },
  { key: 'city', label: '지역', required: true },
  { key: 'seller_type', label: '판매 유형', required: true },
  { key: 'business_name', label: '상호(선택)', required: false, hint: '사업자 있을 때만' },
  { key: 'bio', label: '소개', required: true, hint: '무엇을 파는지 짧게' },
  { key: 'pickup_note', label: '수령/배송 안내(선택)', required: false },
];

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
