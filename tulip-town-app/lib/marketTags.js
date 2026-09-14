/** Marketplace subcategory tags (posts.subcategory when category_slug=market). */
export const MARKET_TAGS = [
  { slug: 'sell', nameKo: '팝니다', nameEn: 'For sale' },
  { slug: 'buy', nameKo: '삽니다', nameEn: 'Wanted' },
  { slug: 'free', nameKo: '무료나눔', nameEn: 'Free' },
  { slug: 'done', nameKo: '완료', nameEn: 'Sold' },
];

export function getMarketTag(slug) {
  if (!slug) return null;
  return MARKET_TAGS.find((t) => t.slug === slug) || null;
}

export function getMarketTagLabel(slug, locale = 'ko') {
  const tag = getMarketTag(slug);
  if (!tag) return '';
  return locale === 'en' ? tag.nameEn || tag.nameKo : tag.nameKo;
}

export function isValidMarketTag(slug) {
  return MARKET_TAGS.some((t) => t.slug === slug);
}
