'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MICHIGAN_STATE_PATH,
  SETTLEMENT_MAP_CITIES,
  SETTLEMENT_MAP_VIEWBOX,
} from '../lib/settlementTowns';

export default function SettlementGuideMap({ city }) {
  const router = useRouter();
  const activeCity = city || null;

  function handleCityClick(cityName) {
    router.push(`/board/guide?city=${encodeURIComponent(cityName)}`);
  }

  function goMap() {
    router.push('/board/guide');
  }

  function onCityKeyDown(e, cityName) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCityClick(cityName);
    }
  }

  return (
    <section className="settle-map" aria-label="미시간 정착 가이드 지도">
      {activeCity ? (
        <nav className="settle-map-breadcrumb" aria-label="선택 경로">
          <button type="button" className="settle-map-crumb" onClick={goMap}>
            미시간
          </button>
          <span className="settle-map-crumb-sep" aria-hidden="true">
            ›
          </span>
          <span className="settle-map-crumb is-current" aria-current="location">
            {activeCity}
          </span>
        </nav>
      ) : null}

      <div className="settle-map-stage">
        <h3 className="settle-map-heading">
          {activeCity ? `${activeCity} · 정착 가이드` : '미시간 · 도시를 선택하세요'}
        </h3>
        <p className="hint-text settle-map-hint">
          {activeCity
            ? '아래 목록에서 글을 선택하거나, 지도에서 다른 도시를 고르세요.'
            : '지도에서 도시를 클릭하면 해당 지역 정착 가이드 글을 볼 수 있습니다.'}
        </p>

        <div className="settle-map-canvas">
          <svg
            viewBox={`0 0 ${SETTLEMENT_MAP_VIEWBOX.width} ${SETTLEMENT_MAP_VIEWBOX.height}`}
            xmlns="http://www.w3.org/2000/svg"
            className="settle-map-svg-root"
            role="img"
            aria-label="미시간 주 지도"
          >
            <path
              d={MICHIGAN_STATE_PATH}
              className="settle-map-land"
              fillRule="evenodd"
            />
            {SETTLEMENT_MAP_CITIES.map((c) => (
              <g
                key={c.name}
                className={`settle-map-city${activeCity === c.name ? ' is-active' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${c.name} 정착 가이드`}
                onClick={() => handleCityClick(c.name)}
                onKeyDown={(e) => onCityKeyDown(e, c.name)}
              >
                <circle cx={c.x} cy={c.y} r="3.4" className="settle-map-dot" />
                <text
                  x={c.lx}
                  y={c.ly}
                  textAnchor={c.anchor}
                  className="settle-map-label"
                >
                  {c.name}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {activeCity ? (
          <div className="settle-map-city-actions">
            <button type="button" className="btn btn-outline settle-map-back" onClick={goMap}>
              ← 지도
            </button>
            <Link href={`/board/guide/new?city=${encodeURIComponent(activeCity)}`} className="btn">
              글쓰기
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
