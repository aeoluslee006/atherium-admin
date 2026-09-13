/** Collect image URLs from posts.image_urls and/or HTML body. */

export function parseImageUrls(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  const raw = String(value).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    // fall through — comma/newline separated
  }
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s) || s.startsWith('data:image/'));
}

export function extractImageSrcs(html) {
  const srcs = [];
  const re = /<img\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const src = (m[2] || m[3] || m[4] || '').trim();
    if (src) srcs.push(src);
  }
  return srcs;
}

export function collectPostImages(post) {
  if (!post) return [];
  const fromField = parseImageUrls(post.image_urls);
  const fromBody = extractImageSrcs(post.body);
  const seen = new Set();
  const out = [];
  for (const src of [...fromField, ...fromBody]) {
    if (seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out;
}

export function stripImagesFromHtml(html) {
  return String(html || '')
    .replace(/<p>\s*<img\b[^>]*>\s*<\/p>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/(<p>\s*<br\s*\/?>\s*<\/p>\s*){2,}/gi, '<p><br/></p>')
    .trim();
}

export function serializeImageUrls(urls) {
  const list = (urls || []).map(String).map((s) => s.trim()).filter(Boolean);
  return list.length ? JSON.stringify(list) : null;
}
