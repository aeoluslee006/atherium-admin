/**
 * Michigan settlement guide — major city pins + satellite towns.
 * `city` values in posts must match these English names exactly.
 */

export const SETTLEMENT_MAP_VIEWBOX = { width: 500, height: 409 };

/** @typedef {{ name: string; x: number; y: number; satellites: string[] }} SettlementMajorCity */

/** @type {SettlementMajorCity[]} */
export const SETTLEMENT_MAJOR_CITIES = [
  {
    name: 'Grand Rapids',
    x: 294.8,
    y: 322.5,
    satellites: ['Holland', 'Zeeland', 'Grandville', 'Hudsonville', 'Wyoming', 'Kentwood'],
  },
  {
    name: 'Lansing',
    x: 361.5,
    y: 336.4,
    satellites: ['East Lansing'],
  },
  {
    name: 'Ann Arbor',
    x: 410.3,
    y: 363.5,
    satellites: [],
  },
  {
    name: 'Detroit',
    x: 452.1,
    y: 360.4,
    satellites: ['Novi', 'Troy', 'Farmington Hills'],
  },
  {
    name: 'Flint',
    x: 413.6,
    y: 319.6,
    satellites: [],
  },
];

const majorByName = new Map(SETTLEMENT_MAJOR_CITIES.map((c) => [c.name, c]));

/** Flat list of every selectable city (majors + satellites). */
export const SETTLEMENT_CITY_NAMES = [
  ...SETTLEMENT_MAJOR_CITIES.flatMap((c) => [c.name, ...c.satellites]),
];

export function isValidSettlementCity(name) {
  return SETTLEMENT_CITY_NAMES.includes(name);
}

export function getSettlementMajorCity(name) {
  return majorByName.get(name) || null;
}

/** Parent major city for a satellite, or the major itself. */
export function getHubForCity(city) {
  const major = majorByName.get(city);
  if (major) return major;
  for (const hub of SETTLEMENT_MAJOR_CITIES) {
    if (hub.satellites.includes(city)) return hub;
  }
  return null;
}

/** Simplified Michigan lower-peninsula outline (viewBox 0 0 500 409). */
export const MICHIGAN_STATE_PATH =
  'M 228 268 L 248 228 L 278 210 L 318 202 L 358 208 L 398 222 L 432 248 L 458 278 L 468 310 L 462 342 L 442 372 L 408 392 L 368 400 L 328 396 L 292 382 L 262 358 L 242 332 L 230 302 Z';

/** @deprecated Use SETTLEMENT_MAJOR_CITIES */
export const SETTLEMENT_HUBS = SETTLEMENT_MAJOR_CITIES.map((c) => ({
  name: c.name,
  satellites: c.satellites,
}));

export function getSettlementHub(name) {
  return getSettlementMajorCity(name);
}

export function isSettlementHub(name) {
  return majorByName.has(name);
}
