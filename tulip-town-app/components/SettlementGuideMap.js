'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getHubForCity,
  getRegionalMapMarkers,
  getSettlementHub,
  getStateMapMarkers,
  isSettlementHub,
  MICHIGAN_STATE_PATH,
  REGIONAL_MAP_PATH,
} from '../lib/settlementTowns';

function MapMarker({ name, x, y, kind, active, onClick }) {
  const isHub = kind === 'hub';
  return (
    <button
      type="button"
      className={`settle-map-marker settle-map-marker--${kind}${active ? ' is-active' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={() => onClick(name)}
      aria-label={`${name}${isHub ? ' 허브' : ''}`}
      title={name}
    >
      <span className="settle-map-marker-dot" aria-hidden="true" />
      <span className="settle-map-marker-label">{name}</span>
    </button>
  );
}

function MapCanvas({ view, markers, activeCity, onSelectCity }) {
  const path = view === 'state' ? MICHIGAN_STATE_PATH : REGIONAL_MAP_PATH;
  return (
    <div className={`settle-map-canvas settle-map-canvas--${view}`}>
      <svg className="settle-map-svg" viewBox="0 0 100 100" aria-hidden="true">
        <path className="settle-map-land" d={path} />
      </svg>
      <div className="settle-map-markers" role="group" aria-label="도시 선택">
        {markers.map((m) => (
          <MapMarker
            key={m.name}
            {...m}
            active={activeCity === m.name}
            onClick={onSelectCity}
          />
        ))}
      </div>
    </div>
  );
}

export default function SettlementGuideMap({ hub, city }) {
  const router = useRouter();
  const activeCity = city || null;
  const activeHub = hub || (city ? getHubForCity(city)?.name : null);

  const step = city ? 3 : activeHub ? 2 : 1;

  function goState() {
    router.push('/board/guide');
  }

  function goHub(hubName) {
    router.push(`/board/guide?hub=${encodeURIComponent(hubName)}`);
  }

  function goCity(cityName) {
    router.push(`/board/guide?city=${encodeURIComponent(cityName)}`);
  }

  function handleStateSelect(name) {
    if (isSettlementHub(name)) {
      goHub(name);
    } else {
      goCity(name);
    }
  }

  function handleRegionalSelect(name) {
    goCity(name);
  }

  const stateMarkers = getStateMapMarkers();
  const regionalMarkers = activeHub ? getRegionalMapMarkers(activeHub) : [];
  const hubMeta = activeHub ? getSettlementHub(activeHub) : null;

  return (
    <section className="settle-map" aria-label="미시간 정착 가이드 지도">
      <nav className="settle-map-breadcrumb" aria-label="지도 단계">
        <button type="button" className="settle-map-crumb" onClick={goState} aria-current={step === 1 ? 'step' : undefined}>
          미시간
        </button>
        {activeHub ? (
          <>
            <span className="settle-map-crumb-sep" aria-hidden="true">
              ›
            </span>
            <button
              type="button"
              className="settle-map-crumb"
              onClick={() => goHub(activeHub)}
              aria-current={step === 2 ? 'step' : undefined}
            >
              {activeHub}
            </button>
          </>
        ) : null}
        {city ? (
          <>
            <span className="settle-map-crumb-sep" aria-hidden="true">
              ›
            </span>
            <span className="settle-map-crumb is-current" aria-current="step">
              {city}
            </span>
          </>
        ) : null}
      </nav>

      <div className="settle-map-stage">
        {step === 1 ? (
          <>
            <h3 className="settle-map-heading">미시간 · 허브 도시를 선택하세요</h3>
            <p className="hint-text settle-map-hint">지도에서 도시를 클릭하면 주변 위성 도시와 정착 가이드 글을 볼 수 있습니다.</p>
            <MapCanvas view="state" markers={stateMarkers} activeCity={activeCity} onSelectCity={handleStateSelect} />
          </>
        ) : step === 2 ? (
          <>
            <h3 className="settle-map-heading">{activeHub} · 주변 도시</h3>
            <p className="hint-text settle-map-hint">
              {hubMeta?.satellites.length
                ? '동네를 클릭하면 해당 지역 정착 가이드 글 목록이 표시됩니다.'
                : '도시를 클릭하세요.'}
            </p>
            <MapCanvas
              view="regional"
              markers={regionalMarkers}
              activeCity={activeCity}
              onSelectCity={handleRegionalSelect}
            />
            <button type="button" className="btn btn-outline settle-map-back" onClick={goState}>
              ← 미시간 지도
            </button>
          </>
        ) : (
          <>
            <h3 className="settle-map-heading">{city} · 정착 가이드</h3>
            <p className="hint-text settle-map-hint">아래 목록에서 글을 선택하거나, 다른 도시를 고르세요.</p>
            <div className="settle-map-city-actions">
              {getHubForCity(city) ? (
                <button
                  type="button"
                  className="btn btn-outline settle-map-back"
                  onClick={() => goHub(getHubForCity(city).name)}
                >
                  ← {getHubForCity(city).name} 주변
                </button>
              ) : (
                <button type="button" className="btn btn-outline settle-map-back" onClick={goState}>
                  ← 미시간 지도
                </button>
              )}
              <Link href={`/board/guide/new?city=${encodeURIComponent(city)}`} className="btn">
                글쓰기
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
