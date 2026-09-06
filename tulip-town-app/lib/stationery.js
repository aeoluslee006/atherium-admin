// Compatibility helpers around stationeryOptions (corner-based stationery v2).
export {
  STATIONERY_OPTIONS,
  getStationeryById,
} from '../components/stationery/stationeryOptions';

import {
  STATIONERY_OPTIONS,
  getStationeryById as getById,
} from '../components/stationery/stationeryOptions';

/** @deprecated legacy theme ids → current ids */
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

export const DEFAULT_STATIONERY_ID = 'diary-doodle';

export function resolveStationeryId(id) {
  if (!id) return DEFAULT_STATIONERY_ID;
  if (STATIONERY_OPTIONS.some((s) => s.id === id)) return id;
  return LEGACY_STATIONERY_MAP[id] || DEFAULT_STATIONERY_ID;
}

export function getStationery(id) {
  return getById(resolveStationeryId(id));
}

export function isValidStationeryId(id) {
  if (!id) return false;
  return STATIONERY_OPTIONS.some((s) => s.id === id) || Boolean(LEGACY_STATIONERY_MAP[id]);
}

export const STATIONERY_THEMES = STATIONERY_OPTIONS.map((s) => ({
  id: s.id,
  nameKo: s.name,
  nameEn: s.name,
}));

/** @deprecated use StationeryBox instead of CSS background papers */
export function stationeryClassName() {
  return '';
}

/** @deprecated use StationeryBox instead of CSS background papers */
export function stationeryBackgroundStyle() {
  return {};
}
