/** Jobs board tags (posts.subcategory when category_slug=jobs). */
export const JOB_TAGS = [
  { slug: 'hire', nameKo: '구인' },
  { slug: 'seek', nameKo: '구직' },
  { slug: 'parttime', nameKo: '알바/파트' },
];

export function getJobTag(slug) {
  if (!slug) return null;
  return JOB_TAGS.find((t) => t.slug === slug) || null;
}

export function getJobTagLabel(slug) {
  return getJobTag(slug)?.nameKo || '';
}

export function isValidJobTag(slug) {
  return JOB_TAGS.some((t) => t.slug === slug);
}
