/** Free-board subcategory tags (posts.subcategory). */
export const FREE_BOARD_FEATURED_TAG = {
  slug: 'featured',
  nameKo: '좋은글',
  nameEn: 'Featured',
};

export const FREE_BOARD_TAGS = [
  { slug: 'daily', nameKo: '일상/잡담', nameEn: 'Daily chat' },
  { slug: 'info', nameKo: '정보공유', nameEn: 'Info share' },
  { slug: 'question', nameKo: '궁금해요', nameEn: 'Questions' },
  { slug: 'recommend', nameKo: '추천', nameEn: 'Recommend' },
  { slug: 'meetup', nameKo: '모임/동호회', nameEn: 'Meetup / clubs' },
  { slug: 'lostfound', nameKo: '분실/습득', nameEn: 'Lost & found' },
  { slug: 'etc', nameKo: '기타', nameEn: 'Other' },
];

/** Write-form options: 좋은글 + subcategory tags (matches list filter chips). */
export const FREE_BOARD_WRITE_TAGS = [FREE_BOARD_FEATURED_TAG, ...FREE_BOARD_TAGS];

export function getFreeBoardTag(slug) {
  if (!slug) return null;
  if (slug === FREE_BOARD_FEATURED_TAG.slug) return FREE_BOARD_FEATURED_TAG;
  // Legacy: 동호회 tag merged into 모임/동호회
  if (slug === 'club') return FREE_BOARD_TAGS.find((t) => t.slug === 'meetup') || null;
  return FREE_BOARD_TAGS.find((t) => t.slug === slug) || null;
}

export function getFreeBoardTagLabel(slug, locale = 'ko') {
  const tag = getFreeBoardTag(slug);
  if (!tag) return slug || '';
  return locale === 'en' ? tag.nameEn || tag.nameKo : tag.nameKo;
}

export function isValidFreeBoardTag(slug) {
  return FREE_BOARD_TAGS.some((t) => t.slug === slug);
}

export function isValidFreeBoardWriteTag(slug) {
  return slug === FREE_BOARD_FEATURED_TAG.slug || isValidFreeBoardTag(slug);
}
