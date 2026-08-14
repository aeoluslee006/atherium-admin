'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { listDirectoryCategories, getDirectoryCategoryLabel } from '../lib/directoryCategories';
import {
  buildDirectorySpreads,
  computePageGridSize,
  directorySpreadLabel,
  formatSlotPrice,
  getDisplayMergeFactor,
  mergeSlotsForDisplay,
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

function SideMenu({ side, categories, category, onSelect, showAll, showList }) {
  return (
    <aside className={`dir-side-menu dir-side-menu--${side}`} aria-label={`카테고리 필터 (${side})`}>
      {showAll ? (
        <button
          type="button"
          className={`dir-side-cat${category === 'all' ? ' is-active' : ''}`}
          onClick={() => onSelect('all')}
          title="전체"
        >
          <span className="dir-side-cat-icon" aria-hidden="true">📋</span>
          <span className="dir-side-cat-label">전체</span>
        </button>
      ) : null}
      {categories.map((c) => (
        <button
          key={c.slug}
          type="button"
          className={`dir-side-cat${category === c.slug ? ' is-active' : ''}`}
          onClick={() => onSelect(c.slug)}
          title={c.nameKo}
        >
          <span className="dir-side-cat-icon" aria-hidden="true">{c.icon}</span>
          <span className="dir-side-cat-label">{c.nameKo}</span>
        </button>
      ))}
      {showList ? (
        <Link href="/directory" className="dir-side-list" title="리스트 보기">
          리스트
        </Link>
      ) : null}
    </aside>
  );
}

function DirectoryPaper({ pageData, category }) {
  const pageNumber = pageData?.pageNumber || 1;
  const slots = pageData?.slots || [];
  const rawSize = computePageGridSize(slots);
  const mergeFactor = getDisplayMergeFactor(pageNumber, rawSize.cols, rawSize.rows);
  const displayCells = useMemo(
    () => mergeSlotsForDisplay(slots, mergeFactor),
    [slots, mergeFactor]
  );
  const displayCols = Math.ceil(rawSize.cols / mergeFactor);
  const displayRows = Math.ceil(rawSize.rows / mergeFactor);

  return (
    <div className="dir-spread-paper">
      <div
        className={`dir-paper${mergeFactor > 1 ? ' is-merged-display' : ''}`}
        style={{ '--dir-cols': displayCols, '--dir-rows': displayRows }}
      >
        <div className="dir-paper-label">
          {pageNumber}면 · {displayCols}열×{displayRows}행
          {mergeFactor > 1 ? ' (4칸 묶음)' : ''}
        </div>
        <div className="dir-grid" aria-label={`${pageNumber}면 광고 지면`}>
          {displayCells.map((cell) => {
            const slot = cell.primary;
            const ad = activeAd(slot);
            const occupied = slot.status === 'occupied' && ad;
            const dim =
              category !== 'all' && occupied && ad.category_slug && ad.category_slug !== category;
            const highlight =
              category !== 'all' && occupied && ad.category_slug === category;
            const isMerged = cell.slots.length > 1;

            return (
              <div
                key={cell.key}
                className={[
                  'dir-cell',
                  occupied ? 'is-occupied' : 'is-empty',
                  dim ? 'is-dimmed' : '',
                  highlight ? 'is-highlight' : '',
                  isMerged ? 'is-merged-block' : '',
                  `tier-${slot.size_tier || 'small'}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  gridColumn: `${cell.displayCol + 1} / span 1`,
                  gridRow: `${cell.displayRow + 1} / span 1`,
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
                ) : isMerged ? (
                  <div className="dir-cell-empty dir-cell-empty--merged">
                    <div className="dir-merged-labels">
                      {cell.slots.map((s) => (
                        <span key={s.id} className="dir-merged-label-item">
                          {s.position_label}
                        </span>
                      ))}
                    </div>
                    <div className="dir-slot-meta">
                      {sizeTierLabel(slot.size_tier)} · {formatSlotPrice(slot.base_price_cents)}
                      {cell.slots.length > 1 ? ` 외 ${cell.slots.length - 1}칸` : ''}
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
  );
}

/** Phase 1: view-only 지면. Apply/checkout wired in a later phase. */
export default function DirectoryPagesView({ pages = [], initialPage = 1 }) {
  const pageNumbers = pages.map((p) => p.pageNumber);
  const spreads = useMemo(() => buildDirectorySpreads(pageNumbers), [pageNumbers]);
  const pageByNumber = useMemo(
    () => new Map(pages.map((p) => [p.pageNumber, p])),
    [pages]
  );

  const initialSpreadIndex = useMemo(() => {
    const n = Number(initialPage) || 1;
    const idx = spreads.findIndex((s) => s.left === n || s.right === n);
    return idx >= 0 ? idx : 0;
  }, [spreads, initialPage]);

  const [spreadIndex, setSpreadIndex] = useState(initialSpreadIndex);
  const [category, setCategory] = useState('all');
  const [mobileMode, setMobileMode] = useState('grid');
  const [zoom, setZoom] = useState(1);

  const spread = spreads[spreadIndex] || spreads[0] || { left: 1, right: null };
  const leftPage = pageByNumber.get(spread.left);
  const rightPage = spread.right != null ? pageByNumber.get(spread.right) : null;
  const isSingleSpread = rightPage == null;

  const allCategories = listDirectoryCategories();
  const categoryHalf = Math.ceil(allCategories.length / 2);
  const leftCategories = allCategories.slice(0, categoryHalf);
  const rightCategories = allCategories.slice(categoryHalf);

  const listSlots = useMemo(() => {
    const nums = [spread.left, spread.right].filter((n) => n != null);
    const rows = [];
    for (const n of nums) {
      const p = pageByNumber.get(n);
      for (const slot of p?.slots || []) rows.push(slot);
    }
    return rows;
  }, [spread, pageByNumber]);

  function goPrev() {
    if (spreadIndex > 0) setSpreadIndex(spreadIndex - 1);
  }
  function goNext() {
    if (spreadIndex < spreads.length - 1) setSpreadIndex(spreadIndex + 1);
  }

  return (
    <div className={`dir-pages${mobileMode === 'list' ? ' is-list-mode' : ''}`}>
      <div className="dir-spread-stage">
        <SideMenu
          side="left"
          categories={leftCategories}
          category={category}
          onSelect={setCategory}
          showAll
        />

        <div
          className={`dir-spread-viewport${zoom > 1 ? ' is-zoomed' : ''}`}
          style={{ '--dir-zoom': zoom }}
        >
          <div
            className={`dir-spread-papers${isSingleSpread ? ' is-single' : ''}`}
            style={{ '--spread-page-count': isSingleSpread ? 1 : 2 }}
          >
            {leftPage ? <DirectoryPaper pageData={leftPage} category={category} /> : null}
            {rightPage ? <DirectoryPaper pageData={rightPage} category={category} /> : null}
          </div>
        </div>

        <SideMenu
          side="right"
          categories={rightCategories}
          category={category}
          onSelect={setCategory}
          showList
        />
      </div>

      <div className="dir-pages-controls">
        <div className="dir-pages-nav" role="tablist" aria-label="지면 페이지">
          <button type="button" className="btn btn-outline dir-pages-arrow" onClick={goPrev} disabled={spreadIndex <= 0}>
            ←
          </button>
          {spreads.map((s, i) => (
            <button
              key={`${s.left}-${s.right ?? 'x'}`}
              type="button"
              role="tab"
              aria-selected={i === spreadIndex}
              className={`dir-pages-tab${i === spreadIndex ? ' is-active' : ''}`}
              onClick={() => setSpreadIndex(i)}
            >
              {directorySpreadLabel(s)}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-outline dir-pages-arrow"
            onClick={goNext}
            disabled={spreadIndex >= spreads.length - 1}
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
          {listSlots.map((slot) => {
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
