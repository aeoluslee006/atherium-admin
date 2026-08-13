/** Fixed business-directory categories for 지면(교차로-style) ads. */

export const DIRECTORY_CATEGORIES = [
  { slug: 'real-estate', nameKo: '부동산', icon: '🏠' },
  { slug: 'beauty', nameKo: '미용실/뷰티', icon: '💇' },
  { slug: 'hospital', nameKo: '병원', icon: '🏥' },
  { slug: 'oriental-medicine', nameKo: '한의원', icon: '🌿' },
  { slug: 'insurance', nameKo: '보험', icon: '🛡️' },
  { slug: 'restaurant', nameKo: '식당', icon: '🍜' },
  { slug: 'market', nameKo: '마켓/식품', icon: '🛒' },
  { slug: 'education', nameKo: '학원/교육', icon: '📚' },
  { slug: 'lawyer', nameKo: '변호사', icon: '⚖️' },
  { slug: 'accountant', nameKo: '회계사', icon: '💼' },
  { slug: 'travel', nameKo: '여행사', icon: '✈️' },
  { slug: 'auto', nameKo: '자동차', icon: '🚗' },
  { slug: 'moving', nameKo: '이사/운송', icon: '📦' },
  { slug: 'construction', nameKo: '건축/인테리어', icon: '🔧' },
  { slug: 'other', nameKo: '기타서비스', icon: '✨' },
];

export function listDirectoryCategories() {
  return DIRECTORY_CATEGORIES;
}

export function getDirectoryCategory(slug) {
  if (!slug) return null;
  return DIRECTORY_CATEGORIES.find((c) => c.slug === slug) || null;
}

/** Alias used by directory UI helpers. */
export function getCategory(slug) {
  return getDirectoryCategory(slug);
}

export function getDirectoryCategoryLabel(slug) {
  return getDirectoryCategory(slug)?.nameKo || slug || '';
}

export function isValidDirectoryCategory(slug) {
  return DIRECTORY_CATEGORIES.some((c) => c.slug === slug);
}
