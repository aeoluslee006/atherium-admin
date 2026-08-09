/** Housing / rent-sale board tags (posts.subcategory when category_slug=housing). */
export const HOUSING_TAGS = [
  { slug: 'rent', nameKo: '렌트' },
  { slug: 'sale', nameKo: '매매' },
  { slug: 'roommate', nameKo: '룸메이트' },
  { slug: 'done', nameKo: '완료' },
];

export const HOUSING_TYPES = [
  { slug: 'studio', nameKo: '스튜디오' },
  { slug: '1br', nameKo: '1베드' },
  { slug: '2br', nameKo: '2베드' },
  { slug: '3br', nameKo: '3베드+' },
  { slug: 'house', nameKo: '하우스' },
  { slug: 'condo', nameKo: '콘도/타운홈' },
  { slug: 'room', nameKo: '방/룸쉐어' },
  { slug: 'commercial', nameKo: '상가/기타' },
];

export function getHousingTag(slug) {
  if (!slug) return null;
  return HOUSING_TAGS.find((t) => t.slug === slug) || null;
}

export function getHousingTagLabel(slug) {
  return getHousingTag(slug)?.nameKo || '';
}

export function isValidHousingTag(slug) {
  return HOUSING_TAGS.some((t) => t.slug === slug);
}

export function getHousingType(slug) {
  if (!slug) return null;
  return HOUSING_TYPES.find((t) => t.slug === slug) || null;
}

export function getHousingTypeLabel(slug) {
  return getHousingType(slug)?.nameKo || '';
}
