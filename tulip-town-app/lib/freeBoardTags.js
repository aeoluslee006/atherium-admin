/** Free-board subcategory tags (posts.subcategory). */
export const FREE_BOARD_TAGS = [
  { slug: 'daily', nameKo: '일상/잡담' },
  { slug: 'info', nameKo: '정보공유' },
  { slug: 'question', nameKo: '궁금해요' },
  { slug: 'recommend', nameKo: '추천' },
  { slug: 'meetup', nameKo: '모임/번개' },
  { slug: 'lostfound', nameKo: '분실/습득' },
  { slug: 'etc', nameKo: '기타' },
];

export function getFreeBoardTag(slug) {
  if (!slug) return null;
  return FREE_BOARD_TAGS.find((t) => t.slug === slug) || null;
}

export function getFreeBoardTagLabel(slug) {
  return getFreeBoardTag(slug)?.nameKo || slug || '';
}

export function isValidFreeBoardTag(slug) {
  return FREE_BOARD_TAGS.some((t) => t.slug === slug);
}
