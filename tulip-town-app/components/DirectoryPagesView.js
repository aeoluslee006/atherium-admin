'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { listDirectoryCategories, getDirectoryCategoryLabel } from '../lib/directoryCategories';
import {
  computePageGridSize,
  formatSlotPrice,
  sizeTierLabel,
} from '../lib/directorySlots';

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

function clampZoom(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n / ZOOM_STEP) * ZOOM_STEP));
}

function activeAd(slot) {
  const ads = slot.directory_slot_ads || slot.ads || [];
  const list = Array.isArray(ads) ? ads : ads ? [ads] : [];
  return list.find((a) => a && a.status === 'active') || null;
}

/** Phase 1: view-only 지면. Apply/checkout wired in a later phase. */
export default function DirectoryPagesView({ pages = [], initialPage = 1 }) {
  const pageNumbers = pages.map((p) => p.pageNumber);
  const [page, setPage] = useState(
    pageNumbers.includes(Number(initialPage)) ? Number(initialPage) : pageNumbers[0] || 1
  );
  const [category, setCategory] = useState('all');
  const [mobileMode, setMobileMode] = useState('grid'); // grid | list
  const [zoom, setZoom] = useState(1);

  const current = useMemo(
    () => pages.find((p) => p.pageNumber === page) || pages[0] || { pageNumber: 1, slots: [] },
    [pages, page]
  );

  const { cols, rows } = useMemo(
    () => computePageGridSize(current.slots || []),
    [current]
  );

  const categories = listDirectoryCategories();
  const pageIndex = pageNumbers.indexOf(page);

  function goPrev() {
    if (pageIndex > 0) setPage(pageNumbers[pageIndex - 1]);
  }
  function goNext() {
    if (pageIndex >= 0 && pageIndex < pageNumbers.length - 1) setPage(pageNumbers[pageIndex + 1]);
  }

  return (
    <div className={`dir-pages${mobileMode === 'list' ? ' is-list-mode' : ''}`}>
      <div className="dir-pages-top">
        <div className="dir-cat-menu" role="listbox" aria-label="카테고리 필터">
          <button
            type="button"
            className={`dir-cat-chip${category === 'all' ? ' is-active' : ''}`}
            onClick={() => setCategory('all')}
          >
            <span aria-hidden="true">📋</span> 전체
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`dir-cat-chip${category === c.slug ? ' is-active' : ''}`}
              onClick={() => setCategory(c.slug)}
            >
              <span aria-hidden="true">{c.icon}</span> {c.nameKo}
            </button>
          ))}
        </div>
        <Link href="/directory" className="btn btn-outline dir-list-link">
          리스트 보기
        </Link>
      </div>

      <div
        className={`dir-paper-scroll${zoom > 1 ? ' is-zoomed' : ''}`}
        style={{ '--dir-zoom': zoom }}
      >
        <div className="dir-paper-zoom-sizer">
          <div
            className="dir-paper"
            style={{
              '--dir-cols': cols,
              '--dir-rows': rows,
            }}
          >
            <div className="dir-paper-label">
              {page}면 · {cols}열×{rows}행
            </div>
            <div className="dir-grid" aria-label={`${page}면 광고 지면`}>
              {(current.slots || []).map((slot) => {
                const ad = activeAd(slot);
                const occupied = slot.status === 'occupied' && ad;
                const dim =
                  category !== 'all' && occupied && ad.category_slug && ad.category_slug !== category;
                const highlight =
                  category !== 'all' && occupied && ad.category_slug === category;

                return (
                  <div
                    key={slot.id}
                    className={[
                      'dir-cell',
                      occupied ? 'is-occupied' : 'is-empty',
                      dim ? 'is-dimmed' : '',
                      highlight ? 'is-highlight' : '',
                      `tier-${slot.size_tier || 'small'}`,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      gridColumn: `${(slot.col_index || 0) + 1} / span ${slot.span_cols || 1}`,
                      gridRow: `${(slot.row_index || 0) + 1} / span ${slot.span_rows || 1}`,
                    }}
                  >
                    {occupied ? (
                      <div className="dir-ad">
                        {ad.ad_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ad.ad_image_url} alt="" className="dir-ad-image" />
                        ) : (
                          <div className="dir-ad-image dir-ad-image--placeholder" />
                        )}
                        <div className="dir-ad-body">
                          <div className="dir-ad-title">{ad.ad_title}</div>
                          <div className="dir-ad-cat">
                            {getDirectoryCategoryLabel(ad.category_slug)}
                          </div>
                          {ad.ad_phone ? <div className="dir-ad-phone">{ad.ad_phone}</div> : null}
                        </div>
                      </div>
                    ) : (
                      <div className="dir-cell-empty">
                        <div className="dir-slot-position">{slot.position_label || '—'}</div>
                        <div className="dir-slot-meta">
                          {sizeTierLabel(slot.size_tier)} · {formatSlotPrice(slot.base_price_cents)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="dir-pages-controls">
        <div className="dir-pages-nav" role="tablist" aria-label="지면 페이지">
          <button type="button" className="btn btn-outline dir-pages-arrow" onClick={goPrev} disabled={pageIndex <= 0}>
            ←
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={n === page}
              className={`dir-pages-tab${n === page ? ' is-active' : ''}`}
              onClick={() => setPage(n)}
            >
              {n}면
            </button>
          ))}
          <button
            type="button"
            className="btn btn-outline dir-pages-arrow"
            onClick={goNext}
            disabled={pageIndex < 0 || pageIndex >= pageNumbers.length - 1}
          >
            →
          </button>
        </div>
        <div className="dir-zoom" role="group" aria-label="지면 확대">
          <button
            type="button"
            className="btn btn-outline dir-zoom-btn"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            aria-label="축소"
          >
            −
          </button>
          <input
            className="dir-zoom-slider"
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={zoom}
            onChange={(e) => setZoom(clampZoom(e.target.value))}
            aria-label="확대 비율"
          />
          <button
            type="button"
            className="btn btn-outline dir-zoom-btn"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            aria-label="확대"
          >
            +
          </button>
          <span className="dir-zoom-pct">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="dir-mobile-toggle" role="group" aria-label="모바일 보기 방식">
          <button
            type="button"
            className={`dir-pages-tab${mobileMode === 'grid' ? ' is-active' : ''}`}
            onClick={() => setMobileMode('grid')}
          >
            그리드
          </button>
          <button
            type="button"
            className={`dir-pages-tab${mobileMode === 'list' ? ' is-active' : ''}`}
            onClick={() => setMobileMode('list')}
          >
            리스트
          </button>
        </div>
      </div>

      {mobileMode === 'list' ? (
        <div className="dir-mobile-list card" aria-label="현재 면 슬롯 리스트">
          {(current.slots || []).map((slot) => {
            const ad = activeAd(slot);
            const occupied = slot.status === 'occupied' && ad;
            return (
              <div key={slot.id} className="dir-mobile-list-row">
                <strong>{slot.position_label}</strong>
                <span>{sizeTierLabel(slot.size_tier)}</span>
                <span>
                  {occupied
                    ? `${ad.ad_title} · ${getDirectoryCategoryLabel(ad.category_slug)}`
                    : '빈 자리'}
                </span>
                <span>{formatSlotPrice(slot.base_price_cents)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
