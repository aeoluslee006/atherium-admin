/** Free-board subcategory tags (posts.subcategory). */
export const FREE_BOARD_FEATURED_TAG = {
  slug: 'featured',
  nameKo: '좋은글',
};

export const FREE_BOARD_TAGS = [
  { slug: 'daily', nameKo: '일상/잡담' },
  { slug: 'info', nameKo: '정보공유' },
  { slug: 'question', nameKo: '궁금해요' },
  { slug: 'recommend', nameKo: '추천' },
  { slug: 'meetup', nameKo: '모임/번개' },
  { slug: 'club', nameKo: '동호회' },
  { slug: 'lostfound', nameKo: '분실/습득' },
  { slug: 'etc', nameKo: '기타' },
];

/** Write-form options: 좋은글 + 7 subcategory tags (matches list filter chips). */
export const FREE_BOARD_WRITE_TAGS = [FREE_BOARD_FEATURED_TAG, ...FREE_BOARD_TAGS];

export function getFreeBoardTag(slug) {
  if (!slug) return null;
  if (slug === FREE_BOARD_FEATURED_TAG.slug) return FREE_BOARD_FEATURED_TAG;
  return FREE_BOARD_TAGS.find((t) => t.slug === slug) || null;
}

export function getFreeBoardTagLabel(slug) {
  return getFreeBoardTag(slug)?.nameKo || slug || '';
}

export function isValidFreeBoardTag(slug) {
  return FREE_BOARD_TAGS.some((t) => t.slug === slug);
}

export function isValidFreeBoardWriteTag(slug) {
  return slug === FREE_BOARD_FEATURED_TAG.slug || isValidFreeBoardTag(slug);
}
