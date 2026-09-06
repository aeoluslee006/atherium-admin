// 편지지(스테이셔너리) 옵션 목록
// - file: public/stationery/ 아래 원본 비율 600x800 그래픽 (사용자 제공 원본 PNG)
// - id 값은 posts.stationery_id 컬럼에 저장

export const STATIONERY_OPTIONS = [
  {
    id: 'diary-doodle',
    name: '다이어리 낙서',
    file: '/stationery/stationery-diary-doodle.png',
  },
  {
    id: 'car-lineart',
    name: '구름과 자동차',
    file: '/stationery/stationery-car-lineart.png',
  },
  {
    id: 'bicycle-lineart',
    name: '꽃바구니 자전거',
    file: '/stationery/stationery-bicycle-lineart.png',
  },
];

/** @deprecated legacy theme ids → current ids */
const LEGACY_STATIONERY_MAP = {
  'pastel-cute': 'diary-doodle',
  'classic-notes': 'diary-doodle',
  'watercolor-floral': 'diary-doodle',
  'vintage-kraft': 'car-lineart',
  'botanical-lineart': 'bicycle-lineart',
  'cream-lined': 'diary-doodle',
  'blush-petal': 'diary-doodle',
  'sage-leaf': 'bicycle-lineart',
  'sky-note': 'bicycle-lineart',
  'linen-grid': 'diary-doodle',
  parchment: 'car-lineart',
  'tulip-garden': 'diary-doodle',
  'cherry-blossom': 'diary-doodle',
  'rose-garden': 'diary-doodle',
  'lavender-field': 'diary-doodle',
  'peony-bloom': 'diary-doodle',
  wildflower: 'diary-doodle',
  'watercolor-wash': 'diary-doodle',
  'gold-foil': 'car-lineart',
  'mint-bloom': 'bicycle-lineart',
  'midnight-ink': 'diary-doodle',
};

export const DEFAULT_STATIONERY_ID = 'diary-doodle';

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
    backgroundSize: 'contain',
    backgroundPosition: 'top center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#fefdf9',
  };
}
