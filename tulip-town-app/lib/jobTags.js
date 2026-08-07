/** Jobs board tags (posts.subcategory when category_slug=jobs). */
export const JOB_TAGS = [
  { slug: 'hire', nameKo: '구인' },
  { slug: 'seek', nameKo: '구직' },
  { slug: 'parttime', nameKo: '알바/파트' },
];

/** Work schedule/status chips (stored in posts.job_roles together with role tags). */
export const JOB_WORK_STATUS = [
  { slug: 'fulltime', nameKo: '풀타임' },
  { slug: 'parttime-role', nameKo: '파트타임' },
  { slug: 'night', nameKo: '야간' },
];

/** Industry/role chips for the compose form. */
export const JOB_ROLE_TAGS = [
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

const WORK_STATUS_SLUGS = new Set(JOB_WORK_STATUS.map((t) => t.slug));
const ALL_ROLE_LABELS = [...JOB_WORK_STATUS, ...JOB_ROLE_TAGS];

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

export function parseJobRoleSlugs(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isWorkStatusSlug(slug) {
  return WORK_STATUS_SLUGS.has(slug);
}

export function getJobRoleLabel(slug) {
  return ALL_ROLE_LABELS.find((t) => t.slug === slug)?.nameKo || slug || '';
}

export function getWorkStatusTags(value) {
  return parseJobRoleSlugs(value)
    .filter(isWorkStatusSlug)
    .map((slug) => JOB_WORK_STATUS.find((t) => t.slug === slug))
    .filter(Boolean);
}

export function getIndustryRoleTags(value) {
  return parseJobRoleSlugs(value)
    .filter((slug) => !isWorkStatusSlug(slug))
    .map((slug) => {
      const found = JOB_ROLE_TAGS.find((t) => t.slug === slug);
      return found || { slug, nameKo: slug };
    });
}

export function formatJobRoles(value) {
  const statuses = getWorkStatusTags(value).map((t) => t.nameKo);
  const roles = getIndustryRoleTags(value).map((t) => t.nameKo);
  return [...statuses, ...roles].filter(Boolean).join(', ');
}

export function formatWorkStatus(value) {
  return getWorkStatusTags(value)
    .map((t) => t.nameKo)
    .join(' · ');
}
