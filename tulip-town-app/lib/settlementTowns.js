/**
 * Settlement Guide towns. `name` is the canonical `posts.city` value
 * (English, exact match — use the dropdown, never free text).
 */

export const SETTLEMENT_HUBS = [
  {
    name: 'Grand Rapids',
    lat: 42.9634,
    lng: -85.6681,
    satellites: [
      { name: 'Holland', lat: 42.7875, lng: -86.1089 },
      { name: 'Zeeland', lat: 42.8125, lng: -86.0186 },
      { name: 'Grandville', lat: 42.9097, lng: -85.7631 },
      { name: 'Hudsonville', lat: 42.8709, lng: -85.865 },
      { name: 'Wyoming', lat: 42.9134, lng: -85.7053 },
      { name: 'Kentwood', lat: 42.8695, lng: -85.6447 },
    ],
  },
  {
    name: 'Ann Arbor',
    lat: 42.2808,
    lng: -83.743,
    satellites: [
      { name: 'Novi', lat: 42.4806, lng: -83.4755 },
      { name: 'Troy', lat: 42.6056, lng: -83.1498 },
      { name: 'Farmington Hills', lat: 42.4985, lng: -83.3677 },
      { name: 'Detroit', lat: 42.3314, lng: -83.0458 },
    ],
  },
  {
    name: 'Lansing',
    lat: 42.7325,
    lng: -84.5555,
    satellites: [
      { name: 'East Lansing', lat: 42.737, lng: -84.4839 },
      { name: 'Flint', lat: 43.0125, lng: -83.6875 },
    ],
  },
];

/** Standalone markers on the state map (no satellites → go straight to posts). */
export const SETTLEMENT_STANDALONE = [];

/** Lower Peninsula outline [lng, lat], clockwise from SW corner. */
export const MICHIGAN_LP_RING = [
  [-86.82, 41.7],
  [-84.81, 41.7],
  [-83.45, 41.7],
  [-83.45, 41.91],
  [-83.15, 41.9],
  [-82.98, 42.26],
  [-83.12, 42.36],
  [-82.88, 42.36],
  [-82.52, 42.55],
  [-82.42, 42.7],
  [-82.42, 43.02],
  [-82.55, 43.58],
  [-82.72, 44.04],
  [-83.05, 44.12],
  [-83.48, 43.84],
  [-83.72, 43.64],
  [-83.92, 43.64],
  [-83.98, 44.08],
  [-83.52, 44.58],
  [-83.45, 45.07],
  [-83.92, 45.4],
  [-84.62, 45.78],
  [-84.78, 45.82],
  [-85.12, 45.76],
  [-85.72, 44.95],
  [-86.08, 44.88],
  [-86.28, 44.76],
  [-86.5, 44.08],
  [-86.42, 43.38],
  [-86.25, 42.98],
  [-86.22, 42.76],
  [-86.38, 42.38],
  [-86.58, 42.08],
  [-86.82, 41.7],
];

/** Upper Peninsula outline [lng, lat]. */
export const MICHIGAN_UP_RING = [
  [-84.73, 45.85],
  [-83.93, 45.98],
  [-83.48, 46.06],
  [-84.22, 46.48],
  [-84.96, 46.77],
  [-85.82, 46.52],
  [-87.02, 46.86],
  [-87.62, 47.38],
  [-88.08, 47.18],
  [-88.42, 47.02],
  [-89.52, 46.98],
  [-90.42, 46.56],
  [-90.12, 46.28],
  [-89.62, 46.08],
  [-88.88, 46.04],
  [-88.02, 45.4],
  [-87.32, 45.36],
  [-86.55, 45.4],
  [-86.02, 45.86],
  [-85.02, 45.88],
  [-84.73, 45.85],
];

export const MI_MAP = {
  width: 420,
  height: 500,
  pad: 16,
  bounds: { minLng: -90.55, maxLng: -82.12, minLat: 41.55, maxLat: 47.58 },
};

export const HUB_MAP = {
  width: 480,
  height: 340,
  pad: 36,
};

const CITY_INDEX = (() => {
  const map = new Map();
  for (const hub of SETTLEMENT_HUBS) {
    map.set(hub.name, { ...hub, kind: 'hub', hubName: hub.name });
    for (const sat of hub.satellites) {
      map.set(sat.name, { ...sat, kind: 'satellite', hubName: hub.name });
    }
  }
  for (const town of SETTLEMENT_STANDALONE) {
    map.set(town.name, { ...town, kind: 'standalone', hubName: null });
  }
  return map;
})();

export const SETTLEMENT_CITY_GROUPS = SETTLEMENT_HUBS.map((hub) => ({
  hub: hub.name,
  cities: [hub.name, ...hub.satellites.map((s) => s.name)],
}));

export const SETTLEMENT_CITY_NAMES = [
  ...SETTLEMENT_CITY_GROUPS.flatMap((g) => g.cities),
  ...SETTLEMENT_STANDALONE.map((t) => t.name),
];

export function canonicalCityName(raw) {
  const n = String(raw || '').trim();
  if (!n) return null;
  return SETTLEMENT_CITY_NAMES.find((c) => c.toLowerCase() === n.toLowerCase()) || null;
}

export function isSettlementCity(name) {
  return Boolean(canonicalCityName(name));
}

export function getTown(name) {
  const canonical = canonicalCityName(name);
  return canonical ? CITY_INDEX.get(canonical) : null;
}

export function getHub(name) {
  const canonical = canonicalCityName(name);
  if (!canonical) return null;
  return SETTLEMENT_HUBS.find((h) => h.name === canonical) || null;
}

export function isHubCity(name) {
  return Boolean(getHub(name));
}

export function guideBoardHref({ city, hub } = {}) {
  if (city) return `/board/guide?city=${encodeURIComponent(city)}`;
  if (hub) return `/board/guide?hub=${encodeURIComponent(hub)}`;
  return '/board/guide';
}

export function hrefForStateMarker(town) {
  if (town.satellites?.length) return guideBoardHref({ hub: town.name });
  return guideBoardHref({ city: town.name });
}

export function project(lat, lng, bounds, width, height, pad = 0) {
  const x = pad + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - pad * 2);
  const y = pad + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (height - pad * 2);
  return { x, y };
}

export function ringToPath(ring, bounds, width, height, pad = 0) {
  return (
    ring
      .map(([lng, lat], i) => {
        const { x, y } = project(lat, lng, bounds, width, height, pad);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ') + ' Z'
  );
}

export function boundsForTowns(towns, padRatio = 0.28) {
  const lats = towns.map((t) => t.lat);
  const lngs = towns.map((t) => t.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  const latPad = Math.max((maxLat - minLat) * padRatio, 0.14);
  const lngPad = Math.max((maxLng - minLng) * padRatio, 0.2);
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

export function hubClusterTowns(hub) {
  return [{ name: hub.name, lat: hub.lat, lng: hub.lng, kind: 'hub' }, ...hub.satellites.map((s) => ({ ...s, kind: 'satellite' }))];
}
