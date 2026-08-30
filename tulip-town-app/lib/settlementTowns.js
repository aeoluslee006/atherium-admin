/**
 * Michigan settlement guide — hub cities, satellites, and map marker positions.
 * `city` values in posts must match these English names exactly.
 */

/** @typedef {{ name: string; x: number; y: number }} MapPoint */

/** @typedef {{ name: string; satellites: string[]; state: MapPoint; regional: Record<string, MapPoint> }} SettlementHub */

/** @type {SettlementHub[]} */
export const SETTLEMENT_HUBS = [
  {
    name: 'Grand Rapids',
    satellites: ['Holland', 'Zeeland', 'Grandville', 'Hudsonville', 'Wyoming', 'Kentwood'],
    state: { x: 26, y: 62 },
    regional: {
      'Grand Rapids': { x: 50, y: 48 },
      Holland: { x: 22, y: 72 },
      Zeeland: { x: 18, y: 58 },
      Grandville: { x: 42, y: 56 },
      Hudsonville: { x: 34, y: 42 },
      Wyoming: { x: 54, y: 52 },
      Kentwood: { x: 62, y: 44 },
    },
  },
  {
    name: 'Ann Arbor',
    satellites: ['Novi', 'Troy', 'Farmington Hills', 'Detroit'],
    state: { x: 58, y: 66 },
    regional: {
      'Ann Arbor': { x: 44, y: 58 },
      Novi: { x: 38, y: 38 },
      Troy: { x: 52, y: 32 },
      'Farmington Hills': { x: 30, y: 44 },
      Detroit: { x: 58, y: 54 },
    },
  },
  {
    name: 'Lansing',
    satellites: ['East Lansing', 'Flint'],
    state: { x: 44, y: 58 },
    regional: {
      Lansing: { x: 42, y: 52 },
      'East Lansing': { x: 54, y: 46 },
      Flint: { x: 62, y: 28 },
    },
  },
];

/** Standalone markers on the state map (no satellite step). */
export const SETTLEMENT_STANDALONE = [];

const hubByName = new Map(SETTLEMENT_HUBS.map((h) => [h.name, h]));

/** Flat list of every selectable city (hubs + satellites + standalone). */
export const SETTLEMENT_CITY_NAMES = [
  ...SETTLEMENT_HUBS.flatMap((h) => [h.name, ...h.satellites]),
  ...SETTLEMENT_STANDALONE.map((s) => s.name),
];

export function isValidSettlementCity(name) {
  return SETTLEMENT_CITY_NAMES.includes(name);
}

export function isSettlementHub(name) {
  return hubByName.has(name);
}

export function getSettlementHub(name) {
  return hubByName.get(name) || null;
}

/** Hub that contains this city (hub itself or one of its satellites). */
export function getHubForCity(city) {
  if (hubByName.has(city)) return hubByName.get(city);
  for (const hub of SETTLEMENT_HUBS) {
    if (hub.satellites.includes(city)) return hub;
  }
  return null;
}

/** Markers for step 1 — hub cities + standalone only. */
export function getStateMapMarkers() {
  return [
    ...SETTLEMENT_HUBS.map((h) => ({
      name: h.name,
      x: h.state.x,
      y: h.state.y,
      kind: 'hub',
    })),
    ...SETTLEMENT_STANDALONE.map((s) => ({
      name: s.name,
      x: s.state.x,
      y: s.state.y,
      kind: 'standalone',
    })),
  ];
}

/** Markers for step 2 — hub + its satellites on the regional map. */
export function getRegionalMapMarkers(hubName) {
  const hub = hubByName.get(hubName);
  if (!hub) return [];
  return Object.entries(hub.regional).map(([name, pt]) => ({
    name,
    x: pt.x,
    y: pt.y,
    kind: name === hub.name ? 'hub' : 'satellite',
  }));
}

/** Simplified Michigan lower-peninsula outline (viewBox 0 0 100 100). */
export const MICHIGAN_STATE_PATH =
  'M 8 18 L 22 8 L 38 6 L 52 10 L 68 8 L 82 14 L 90 28 L 88 42 L 84 56 L 78 68 L 72 78 L 64 88 L 52 94 L 38 92 L 26 86 L 16 76 L 10 64 L 8 50 L 6 36 Z';

/** Soft regional backdrop for hub zoom maps. */
export const REGIONAL_MAP_PATH =
  'M 6 10 L 94 10 L 96 90 L 4 90 Z';
