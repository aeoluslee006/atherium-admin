'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MICHIGAN_STATE_PATH,
  SETTLEMENT_MAJOR_CITIES,
  SETTLEMENT_MAP_VIEWBOX,
} from '../lib/settlementTowns';

function pctX(x) {
  return `${(x / SETTLEMENT_MAP_VIEWBOX.width) * 100}%`;
}

function pctY(y) {
  return `${(y / SETTLEMENT_MAP_VIEWBOX.height) * 100}%`;
}

function MajorCityPin({ city, activeCity, openRegion, onSelectCity, onToggleRegion }) {
  const hasSatellites = city.satellites.length > 0;
  const isOpen = openRegion === city.name;
  const isActive =
    activeCity === city.name || (activeCity && city.satellites.includes(activeCity));

  return (
    <div
      className={`settle-map-pin${isActive ? ' is-active' : ''}`}
      style={{ left: pctX(city.x), top: pctY(city.y) }}
    >
      <div className="settle-map-pin-row">
        <button
          type="button"
          className="settle-map-pin-main"
          onClick={() => onSelectCity(city.name)}
          aria-label={`${city.name} 정착 가이드`}
        >
          <span className="settle-map-pin-dot" aria-hidden="true" />
          <span className="settle-map-pin-label">{city.name}</span>
        </button>
        {hasSatellites ? (
          <button
            type="button"
            className={`settle-map-pin-badge${isOpen ? ' is-open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleRegion(city.name);
            }}
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-label={`${city.name} 주변 ${city.satellites.length}개 도시`}
          >
            +{city.satellites.length}
          </button>
        ) : null}
      </div>

      {hasSatellites && isOpen ? (
        <>
          <button
            type="button"
            className="settle-map-popover-backdrop"
            aria-label="목록 닫기"
            onClick={() => onToggleRegion(city.name)}
          />
          <div className="settle-map-popover" role="menu" aria-label={`${city.name} 주변 도시`}>
            <div className="settle-map-popover-head">{city.name} 주변</div>
            <ul className="settle-map-popover-list">
              {city.satellites.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className={`settle-map-popover-item${activeCity === name ? ' is-active' : ''}`}
                    role="menuitem"
                    onClick={() => onSelectCity(name)}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function SettlementGuideMap({ city }) {
  const router = useRouter();
  const rootRef = useRef(null);
  const [openRegion, setOpenRegion] = useState(null);
  const activeCity = city || null;

  useEffect(() => {
    setOpenRegion(null);
  }, [city]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpenRegion(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function goCity(cityName) {
    setOpenRegion(null);
    router.push(`/board/guide?city=${encodeURIComponent(cityName)}`);
  }

  function goMap() {
    setOpenRegion(null);
    router.push('/board/guide');
  }

  function toggleRegion(name) {
    setOpenRegion((prev) => (prev === name ? null : name));
  }

  return (
    <section className="settle-map" aria-label="미시간 정착 가이드 지도" ref={rootRef}>
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
            : '큰 도시 핀을 클릭하거나 +숫자 뱃지로 주변 도시를 펼쳐 보세요.'}
        </p>

        <div
          className="settle-map-canvas"
          style={{ aspectRatio: `${SETTLEMENT_MAP_VIEWBOX.width} / ${SETTLEMENT_MAP_VIEWBOX.height}` }}
        >
          <svg
            className="settle-map-svg"
            viewBox={`0 0 ${SETTLEMENT_MAP_VIEWBOX.width} ${SETTLEMENT_MAP_VIEWBOX.height}`}
            aria-hidden="true"
          >
            <path className="settle-map-land" d={MICHIGAN_STATE_PATH} />
          </svg>
          <div className="settle-map-pins" role="group" aria-label="도시 선택">
            {SETTLEMENT_MAJOR_CITIES.map((major) => (
              <MajorCityPin
                key={major.name}
                city={major}
                activeCity={activeCity}
                openRegion={openRegion}
                onSelectCity={goCity}
                onToggleRegion={toggleRegion}
              />
            ))}
          </div>
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
