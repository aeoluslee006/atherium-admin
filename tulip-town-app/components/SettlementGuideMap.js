'use client';

import { useRouter } from 'next/navigation';
import {
  MICHIGAN_STATE_PATH,
  SETTLEMENT_MAP_CITIES,
  SETTLEMENT_MAP_VIEWBOX,
} from '../lib/settlementTowns';
import { useLocale } from './LocaleProvider';

export default function SettlementGuideMap({ city }) {
  const { t } = useLocale();
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
    <section className="settle-map" aria-label={t('guide.mapAria')}>
      <div className="settle-map-stage">
        <div className="settle-map-canvas">
          <svg
            viewBox={`0 0 ${SETTLEMENT_MAP_VIEWBOX.width} ${SETTLEMENT_MAP_VIEWBOX.height}`}
            xmlns="http://www.w3.org/2000/svg"
            className="settle-map-svg-root"
            role="img"
            aria-label={t('guide.stateMapAria')}
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
                aria-label={t('guide.cityAria', { city: c.name })}
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
              {t('guide.backMap')}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
