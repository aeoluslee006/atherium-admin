/** Jobs board tags (posts.subcategory when category_slug=jobs). */
export const JOB_TAGS = [
  { slug: 'hire', nameKo: '구인', nameEn: 'Hiring' },
  { slug: 'seek', nameKo: '구직', nameEn: 'Seeking' },
  { slug: 'parttime', nameKo: '알바/파트', nameEn: 'Part-time' },
];

/** Work schedule/status chips (stored in posts.job_roles together with role tags). */
export const JOB_WORK_STATUS = [
  { slug: 'fulltime', nameKo: '풀타임', nameEn: 'Full-time' },
  { slug: 'parttime-role', nameKo: '파트타임', nameEn: 'Part-time' },
  { slug: 'night', nameKo: '야간', nameEn: 'Night' },
];

/** Industry/role chips for the compose form. */
export const JOB_ROLE_TAGS = [
  { slug: 'server', nameKo: '서버/홀', nameEn: 'Server / floor' },
  { slug: 'kitchen', nameKo: '주방/요리', nameEn: 'Kitchen / cook' },
  { slug: 'cashier', nameKo: '캐셔', nameEn: 'Cashier' },
  { slug: 'sales', nameKo: '세일즈', nameEn: 'Sales' },
  { slug: 'office', nameKo: '사무/행정', nameEn: 'Office / admin' },
  { slug: 'driver', nameKo: '드라이버/배달', nameEn: 'Driver / delivery' },
  { slug: 'warehouse', nameKo: '창고/물류', nameEn: 'Warehouse / logistics' },
  { slug: 'cleaning', nameKo: '청소', nameEn: 'Cleaning' },
  { slug: 'care', nameKo: '돌봄/베이비시터', nameEn: 'Care / babysitter' },
  { slug: 'beauty', nameKo: '뷰티/네일', nameEn: 'Beauty / nail' },
  { slug: 'construction', nameKo: '건설/시공', nameEn: 'Construction' },
  { slug: 'tech', nameKo: 'IT/기술', nameEn: 'IT / tech' },
  { slug: 'other', nameKo: '기타', nameEn: 'Other' },
];

export const JOB_HIRE_BODY_TEMPLATE = `<p><strong>1. 모집 직책</strong></p><p>-</p><p><strong>2. 담당 업무</strong></p><p>-</p><p><strong>3. 자격 요건</strong></p><p>-</p><p><strong>4. 근무지 / 복지</strong></p><p>-</p><p><strong>5. 연락 방법</strong></p><p>-</p>`;

const WORK_STATUS_SLUGS = new Set(JOB_WORK_STATUS.map((t) => t.slug));
const ALL_ROLE_LABELS = [...JOB_WORK_STATUS, ...JOB_ROLE_TAGS];

function localizedName(tag, locale = 'ko') {
  if (!tag) return '';
  return locale === 'en' ? tag.nameEn || tag.nameKo : tag.nameKo;
}

export function getJobTag(slug) {
  if (!slug) return null;
  return JOB_TAGS.find((t) => t.slug === slug) || null;
}

export function getJobTagLabel(slug, locale = 'ko') {
  return localizedName(getJobTag(slug), locale);
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

export function getJobRoleLabel(slug, locale = 'ko') {
  const tag = ALL_ROLE_LABELS.find((t) => t.slug === slug);
  return localizedName(tag, locale) || slug || '';
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
      return found || { slug, nameKo: slug, nameEn: slug };
    });
}

export function formatJobRoles(value, locale = 'ko') {
  const statuses = getWorkStatusTags(value).map((t) => localizedName(t, locale));
  const roles = getIndustryRoleTags(value).map((t) => localizedName(t, locale));
  return [...statuses, ...roles].filter(Boolean).join(', ');
}

export function formatWorkStatus(value, locale = 'ko') {
  return getWorkStatusTags(value)
    .map((t) => localizedName(t, locale))
    .join(' · ');
}
