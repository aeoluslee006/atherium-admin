/** Marketplace subcategory tags (posts.subcategory when category_slug=market). */
export const MARKET_TAGS = [
  { slug: 'sell', nameKo: '팝니다' },
  { slug: 'buy', nameKo: '삽니다' },
  { slug: 'free', nameKo: '무료나눔' },
  { slug: 'done', nameKo: '완료' },
];

export function getMarketTag(slug) {
  if (!slug) return null;
  return MARKET_TAGS.find((t) => t.slug === slug) || null;
}

export function getMarketTagLabel(slug) {
  return getMarketTag(slug)?.nameKo || '';
}

export function isValidMarketTag(slug) {
  return MARKET_TAGS.some((t) => t.slug === slug);
}
