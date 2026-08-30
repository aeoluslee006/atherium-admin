import Link from 'next/link';
import {
  HUB_MAP,
  MI_MAP,
  MICHIGAN_LP_RING,
  MICHIGAN_UP_RING,
  SETTLEMENT_HUBS,
  SETTLEMENT_STANDALONE,
  boundsForTowns,
  guideBoardHref,
  hubClusterTowns,
  hrefForStateMarker,
  project,
  ringToPath,
} from '../lib/settlementTowns';

const LP_PATH = ringToPath(MICHIGAN_LP_RING, MI_MAP.bounds, MI_MAP.width, MI_MAP.height, MI_MAP.pad);
const UP_PATH = ringToPath(MICHIGAN_UP_RING, MI_MAP.bounds, MI_MAP.width, MI_MAP.height, MI_MAP.pad);

function pinStyle(x, y, width, height) {
  return {
    left: `${(x / width) * 100}%`,
    top: `${(y / height) * 100}%`,
  };
}

function labelSide(x, width, variant, index = 0) {
  const t = x / width;
  if (t < 0.28) return 'right';
  if (t > 0.72) return 'left';
  if (variant === 'hub') return index % 2 === 0 ? 'top' : 'bottom';
  if (t < 0.38) return 'right';
  if (t > 0.62) return 'left';
  return 'top';
}

function MarkerPin({ town, href, variant, index = 0 }) {
  const side = labelSide(town.x, town.mapW, variant, index);
  return (
    <Link
      href={href}
      className={`guide-map-pin guide-map-pin--${variant} guide-map-pin--${side}${town.kind === 'hub' ? ' is-hub' : ''}`}
      style={pinStyle(town.x, town.y, town.mapW, town.mapH)}
    >
      <span className="guide-map-dot" aria-hidden="true" />
      <span className="guide-map-name">{town.name}</span>
    </Link>
  );
}

export function MichiganStateMap() {
  const markers = [...SETTLEMENT_HUBS, ...SETTLEMENT_STANDALONE].map((town) => {
    const { x, y } = project(town.lat, town.lng, MI_MAP.bounds, MI_MAP.width, MI_MAP.height, MI_MAP.pad);
    return {
      ...town,
      x,
      y,
      mapW: MI_MAP.width,
      mapH: MI_MAP.height,
      kind: town.satellites?.length ? 'hub' : 'standalone',
    };
  });

  return (
    <div className="guide-map">
      <p className="guide-map-hint">도시를 클릭하세요 · Click a city on the map</p>
      <div
        className="guide-map-stage guide-map-stage--state"
        style={{ aspectRatio: `${MI_MAP.width} / ${MI_MAP.height}` }}
      >
        <svg
          className="guide-map-svg"
          viewBox={`0 0 ${MI_MAP.width} ${MI_MAP.height}`}
          role="img"
          aria-label="Michigan map with settlement hub cities"
        >
          <rect className="guide-map-water" x="0" y="0" width={MI_MAP.width} height={MI_MAP.height} rx="18" />
          <path className="guide-map-land" d={UP_PATH} />
          <path className="guide-map-land" d={LP_PATH} />
        </svg>
        {markers.map((town) => (
          <MarkerPin
            key={town.name}
            town={town}
            href={hrefForStateMarker(town)}
            variant="state"
          />
        ))}
      </div>
      <ul className="guide-map-fallback">
        {markers.map((town) => (
          <li key={town.name}>
            <Link href={hrefForStateMarker(town)}>{town.name}</Link>
            {town.satellites?.length ? <span>허브 · 주변 {town.satellites.length}곳</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HubZoomMap({ hub }) {
  const towns = hubClusterTowns(hub);
  const bounds = boundsForTowns(towns);
  const markers = towns.map((town) => {
    const { x, y } = project(town.lat, town.lng, bounds, HUB_MAP.width, HUB_MAP.height, HUB_MAP.pad);
    return { ...town, x, y, mapW: HUB_MAP.width, mapH: HUB_MAP.height };
  });

  return (
    <div className="guide-map">
      <p className="guide-map-hint">
        {hub.name} 주변 도시를 선택하세요 · Choose a town near {hub.name}
      </p>
      <div
        className="guide-map-stage guide-map-stage--hub"
        style={{ aspectRatio: `${HUB_MAP.width} / ${HUB_MAP.height}` }}
      >
        <svg
          className="guide-map-svg"
          viewBox={`0 0 ${HUB_MAP.width} ${HUB_MAP.height}`}
          role="img"
          aria-label={`${hub.name} area map`}
        >
          <rect className="guide-map-water" x="0" y="0" width={HUB_MAP.width} height={HUB_MAP.height} rx="18" />
          <rect
            className="guide-map-hub-area"
            x="48"
            y="48"
            width={HUB_MAP.width - 96}
            height={HUB_MAP.height - 96}
            rx="22"
          />
        </svg>
        {markers.map((town, index) => (
          <MarkerPin
            key={town.name}
            town={town}
            href={guideBoardHref({ city: town.name })}
            variant="hub"
            index={index}
          />
        ))}
      </div>
      <ul className="guide-map-fallback">
        {markers.map((town) => (
          <li key={town.name}>
            <Link href={guideBoardHref({ city: town.name })}>{town.name}</Link>
            {town.kind === 'hub' ? <span>허브</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
