/** Housing / rent-sale board tags (posts.subcategory when category_slug=housing). */
export const HOUSING_TAGS = [
  { slug: 'rent', nameKo: '렌트', nameEn: 'Rent' },
  { slug: 'sale', nameKo: '매매', nameEn: 'Sale' },
  { slug: 'roommate', nameKo: '룸메이트', nameEn: 'Roommate' },
  { slug: 'done', nameKo: '완료', nameEn: 'Closed' },
];

export const HOUSING_TYPES = [
  { slug: 'studio', nameKo: '스튜디오', nameEn: 'Studio' },
  { slug: '1br', nameKo: '1베드', nameEn: '1 bed' },
  { slug: '2br', nameKo: '2베드', nameEn: '2 bed' },
  { slug: '3br', nameKo: '3베드+', nameEn: '3+ bed' },
  { slug: 'house', nameKo: '하우스', nameEn: 'House' },
  { slug: 'condo', nameKo: '콘도/타운홈', nameEn: 'Condo / townhome' },
  { slug: 'room', nameKo: '방/룸쉐어', nameEn: 'Room / share' },
  { slug: 'commercial', nameKo: '상가/기타', nameEn: 'Commercial / other' },
];

export function getHousingTag(slug) {
  if (!slug) return null;
  return HOUSING_TAGS.find((t) => t.slug === slug) || null;
}

export function getHousingTagLabel(slug, locale = 'ko') {
  const tag = getHousingTag(slug);
  if (!tag) return '';
  return locale === 'en' ? tag.nameEn || tag.nameKo : tag.nameKo;
}

export function isValidHousingTag(slug) {
  return HOUSING_TAGS.some((t) => t.slug === slug);
}

export function getHousingType(slug) {
  if (!slug) return null;
  return HOUSING_TYPES.find((t) => t.slug === slug) || null;
}

export function getHousingTypeLabel(slug, locale = 'ko') {
  const type = getHousingType(slug);
  if (!type) return '';
  return locale === 'en' ? type.nameEn || type.nameKo : type.nameKo;
}
