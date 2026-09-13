/**
 * Pick one featured ("좋은 글") post per calendar day from the checked pool.
 * Same day → same post for everyone (stable). Next day → may rotate.
 */

const SITE_TZ = 'America/Detroit';

export function siteDateKey(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: SITE_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @template {{ id: string }} T
 * @param {T[]} posts
 * @param {string} [dateKey]
 * @returns {T | null}
 */
export function pickDailyFeatured(posts, dateKey = siteDateKey()) {
  const list = Array.isArray(posts) ? posts.filter((p) => p && p.id) : [];
  if (!list.length) return null;
  if (list.length === 1) return list[0];

  const sorted = [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const idx = hashString(`${dateKey}:${sorted.map((p) => p.id).join(',')}`) % sorted.length;
  return sorted[idx];
}
