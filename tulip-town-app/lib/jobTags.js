/** Jobs board tags (posts.subcategory when category_slug=jobs). */
export const JOB_TAGS = [
  { slug: 'hire', nameKo: '구인' },
  { slug: 'seek', nameKo: '구직' },
  { slug: 'parttime', nameKo: '알바/파트' },
];

/** Suggested role/industry chips for the compose form (stored in posts.job_roles). */
export const JOB_ROLE_TAGS = [
  { slug: 'fulltime', nameKo: '풀타임' },
  { slug: 'parttime-role', nameKo: '파트타임' },
  { slug: 'server', nameKo: '서버/홀' },
  { slug: 'kitchen', nameKo: '주방/요리' },
  { slug: 'cashier', nameKo: '캐셔' },
  { slug: 'sales', nameKo: '세일즈' },
  { slug: 'office', nameKo: '사무/행정' },
  { slug: 'driver', nameKo: '드라이버/배달' },
  { slug: 'warehouse', nameKo: '창고/물류' },
  { slug: 'cleaning', nameKo: '청소' },
  { slug: 'care', nameKo: '돌봄/베이비시터' },
  { slug: 'beauty', nameKo: '뷰티/네일' },
  { slug: 'construction', nameKo: '건설/시공' },
  { slug: 'tech', nameKo: 'IT/기술' },
  { slug: 'other', nameKo: '기타' },
];

export const JOB_HIRE_BODY_TEMPLATE = `<p><strong>1. 모집 직책</strong></p><p>-</p><p><strong>2. 담당 업무</strong></p><p>-</p><p><strong>3. 자격 요건</strong></p><p>-</p><p><strong>4. 근무지 / 복지</strong></p><p>-</p><p><strong>5. 연락 방법</strong></p><p>-</p>`;

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

export function getJobRoleLabel(slug) {
  return JOB_ROLE_TAGS.find((t) => t.slug === slug)?.nameKo || slug || '';
}

export function formatJobRoles(value) {
  if (!value) return '';
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((slug) => getJobRoleLabel(slug))
    .join(', ');
}
