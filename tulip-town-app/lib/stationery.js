/** Letter-paper themes for 좋은글 (featured) posts. */

export const STATIONERY_THEMES = [
  {
    id: 'cream-lined',
    nameKo: '크림 줄노트',
    nameEn: 'Cream lined',
  },
  {
    id: 'blush-petal',
    nameKo: '블러시',
    nameEn: 'Blush',
  },
  {
    id: 'sage-leaf',
    nameKo: '세이지',
    nameEn: 'Sage',
  },
  {
    id: 'sky-note',
    nameKo: '하늘',
    nameEn: 'Sky',
  },
  {
    id: 'linen-grid',
    nameKo: '린넨 격자',
    nameEn: 'Linen grid',
  },
  {
    id: 'parchment',
    nameKo: '양피지',
    nameEn: 'Parchment',
  },
];

export const DEFAULT_STATIONERY_ID = STATIONERY_THEMES[0].id;

export function getStationery(id) {
  if (!id) return null;
  return STATIONERY_THEMES.find((t) => t.id === id) || null;
}

export function isValidStationeryId(id) {
  return STATIONERY_THEMES.some((t) => t.id === id);
}

export function stationeryClassName(id) {
  const theme = getStationery(id);
  if (!theme) return '';
  return `letter-paper letter-paper--${theme.id}`;
}
