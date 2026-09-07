/** Directory slot ad copy + image helpers. */

export const DIR_AD_MAX_IMAGES = 5;
export const DIR_AD_MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

/** Body length by size_tier (composed large=6×4, ultra=full page). */
export const DIR_AD_BODY_MAX = {
  ultra: 400,
  large: 220,
  medium: 80,
  small: 48,
};

export const DIR_AD_IMAGE_GUIDE = {
  ultra: {
    label: '울트라(전면)',
    size: '가로 1080×세로 1620px (2:3) 권장 · 페이지 전체',
    tip: '전면 광고처럼 메인 비주얼 + 로고 + 연락처가 한 장에 들어오게',
  },
  large: {
    label: '대형(6×4)',
    size: '가로 1080×세로 720px (3:2) 권장',
    tip: '가게 외관·대표 메뉴처럼 한눈에 들어오는 가로형 사진',
  },
  medium: {
    label: '중형',
    size: '가로 700×세로 700px (정사각) 권장',
    tip: '로고 또는 대표 상품이 중앙에 오게',
  },
  small: {
    label: '소형',
    size: '가로 600×세로 600px (정사각) 권장',
    tip: '작은 칸이라 글자·얼굴이 큰 사진이 잘 보입니다',
  },
};

export function adBodyLimit(sizeTier) {
  return DIR_AD_BODY_MAX[sizeTier] || DIR_AD_BODY_MAX.small;
}

export function adImageGuide(sizeTier) {
  return DIR_AD_IMAGE_GUIDE[sizeTier] || DIR_AD_IMAGE_GUIDE.small;
}

export function normalizeAdImageUrls(input, fallbackSingle = null) {
  let list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string' && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) list = parsed;
      else list = [input];
    } catch {
      list = input.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  list = list.map((u) => String(u || '').trim()).filter(Boolean);
  if (!list.length && fallbackSingle) {
    const one = String(fallbackSingle).trim();
    if (one) list = [one];
  }
  // de-dupe, cap
  const seen = new Set();
  const out = [];
  for (const u of list) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= DIR_AD_MAX_IMAGES) break;
  }
  return out;
}

export function primaryAdImage(ad) {
  const urls = normalizeAdImageUrls(ad?.ad_image_urls, ad?.ad_image_url);
  return urls[0] || '';
}

export function writingGuide(sizeTier) {
  const limit = adBodyLimit(sizeTier);
  if (sizeTier === 'ultra') {
    return `전면 소개 문단 (${limit}자 이내). 상호·강점·영업시간·연락처를 나눠 적어도 됩니다.`;
  }
  if (sizeTier === 'large') {
    return `소개 2~4문장 (${limit}자 이내).`;
  }
  if (sizeTier === 'medium') {
    return `핵심 한두 줄 (${limit}자 이내).`;
  }
  return `한 줄 문구 (${limit}자 이내).`;
}
