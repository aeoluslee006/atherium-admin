// 편지지(스테이셔너리) 옵션 목록
// - file: public/stationery/ 아래 SVG
// - id 값은 posts.stationery_id 컬럼에 저장

export const STATIONERY_OPTIONS = [
  {
    id: 'classic-notes',
    name: '클래식 노트',
    file: '/stationery/classic-notes.svg',
  },
  {
    id: 'watercolor-floral',
    name: '수채화 꽃',
    file: '/stationery/stationery-watercolor-floral.svg',
  },
  {
    id: 'pastel-cute',
    name: '파스텔 큐트',
    file: '/stationery/stationery-pastel-cute.svg',
  },
  {
    id: 'vintage-kraft',
    name: '빈티지 크래프트',
    file: '/stationery/stationery-vintage-kraft.svg',
  },
  {
    id: 'botanical-lineart',
    name: '보태니컬 라인아트',
    file: '/stationery/stationery-botanical-lineart.svg',
  },
  {
    id: 'bicycle-lineart',
    name: '자전거',
    file: '/stationery/stationery-bicycle-lineart.svg',
  },
  {
    id: 'car-lineart',
    name: '자동차',
    file: '/stationery/stationery-car-lineart.svg',
  },
  {
    id: 'diary-doodle',
    name: '다이어리 낙서',
    file: '/stationery/stationery-diary-doodle.svg',
  },
];

/** @deprecated legacy CSS theme ids → new SVG ids */
const LEGACY_STATIONERY_MAP = {
  'cream-lined': 'classic-notes',
  'blush-petal': 'pastel-cute',
  'sage-leaf': 'botanical-lineart',
  'sky-note': 'bicycle-lineart',
  'linen-grid': 'diary-doodle',
  parchment: 'vintage-kraft',
  'tulip-garden': 'watercolor-floral',
  'cherry-blossom': 'watercolor-floral',
  'rose-garden': 'pastel-cute',
  'lavender-field': 'pastel-cute',
  'peony-bloom': 'watercolor-floral',
  wildflower: 'watercolor-floral',
  'watercolor-wash': 'watercolor-floral',
  'gold-foil': 'vintage-kraft',
  'mint-bloom': 'botanical-lineart',
  'midnight-ink': 'classic-notes',
};

export const DEFAULT_STATIONERY_ID = STATIONERY_OPTIONS[0].id;

export function resolveStationeryId(id) {
  if (!id) return DEFAULT_STATIONERY_ID;
  if (STATIONERY_OPTIONS.some((s) => s.id === id)) return id;
  return LEGACY_STATIONERY_MAP[id] || DEFAULT_STATIONERY_ID;
}

export function getStationeryById(id) {
  const resolved = resolveStationeryId(id);
  return STATIONERY_OPTIONS.find((s) => s.id === resolved) || STATIONERY_OPTIONS[0];
}

/** Aliases for older imports */
export const STATIONERY_THEMES = STATIONERY_OPTIONS.map((s) => ({
  id: s.id,
  nameKo: s.name,
  nameEn: s.name,
  file: s.file,
}));

export function getStationery(id) {
  return getStationeryById(id);
}

export function isValidStationeryId(id) {
  if (!id) return false;
  return STATIONERY_OPTIONS.some((s) => s.id === id) || Boolean(LEGACY_STATIONERY_MAP[id]);
}

export function stationeryClassName(id) {
  const s = getStationeryById(id);
  return `letter-paper letter-paper--svg letter-paper--${s.id}`;
}

export function stationeryBackgroundStyle(id) {
  const s = getStationeryById(id);
  return {
    backgroundImage: `url('${s.file}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
  };
}
