'use client';

import { useMemo, useState } from 'react';
import { listDirectoryCategories, getDirectoryCategoryLabel } from '../lib/directoryCategories';
import {
  DIRECTORY_GRID_COLS,
  DIRECTORY_GRID_ROWS,
  formatSlotPrice,
  sizeTierLabel,
} from '../lib/directorySlots';

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

  const current = useMemo(
    () => pages.find((p) => p.pageNumber === page) || pages[0] || { pageNumber: 1, slots: [] },
    [pages, page]
  );

  const availableRows = useMemo(() => {
    const rows = [];
    for (const p of pages) {
      for (const slot of p.slots || []) {
        if (slot.status === 'available') {
          rows.push({ ...slot, pageNumber: p.pageNumber });
        }
      }
    }
    return rows.sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
      if (a.row_index !== b.row_index) return a.row_index - b.row_index;
      return a.col_index - b.col_index;
    });
  }, [pages]);

  const categories = listDirectoryCategories();
  const pageIndex = pageNumbers.indexOf(page);

  function goPrev() {
    if (pageIndex > 0) setPage(pageNumbers[pageIndex - 1]);
  }
  function goNext() {
    if (pageIndex >= 0 && pageIndex < pageNumbers.length - 1) setPage(pageNumbers[pageIndex + 1]);
  }

  return (
    <div className="dir-pages">
      <div className="dir-pages-toolbar">
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
        <p className="hint-text dir-pages-hint">
          지면은 보기 전용입니다. 광고 신청은 다음 단계에서 연결됩니다.
        </p>
      </div>

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

      <div
        className={`dir-paper-scroll${mobileMode === 'list' ? ' is-list-mode' : ''}`}
      >
        <div
          className="dir-paper"
          style={{
            '--dir-cols': DIRECTORY_GRID_COLS,
            '--dir-rows': DIRECTORY_GRID_ROWS,
          }}
        >
          <div className="dir-paper-label">{page}면</div>
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
                      </div>
                    </div>
                  ) : (
                    <div className="dir-empty-label">{slot.position_label || '—'}</div>
                  )}
                </div>
              );
            })}
          </div>
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

      <section className="dir-vacancy" aria-label="빈 자리 안내">
        <div className="dir-vacancy-head">
          <h3 className="section-title" style={{ margin: 0, fontSize: 18 }}>
            빈 자리 안내
          </h3>
          <p className="hint-text">페이지·위치·크기·가격을 확인하세요. 신청은 곧 연결됩니다.</p>
        </div>

        {availableRows.length ? (
          <div className="card dir-vacancy-table-wrap">
            <table className="dir-vacancy-table">
              <thead>
                <tr>
                  <th>페이지</th>
                  <th>위치</th>
                  <th>크기</th>
                  <th>가격</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {availableRows.map((slot) => (
                  <tr key={slot.id}>
                    <td>{slot.pageNumber}면</td>
                    <td>
                      <strong>{slot.position_label}</strong>
                    </td>
                    <td>{sizeTierLabel(slot.size_tier)}</td>
                    <td>{formatSlotPrice(slot.base_price_cents)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled
                        title="준비중 — 다음 단계에서 신청이 연결됩니다"
                        aria-disabled="true"
                      >
                        광고 신청 (준비중)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card empty-state">현재 표시할 빈 자리가 없습니다.</div>
        )}
      </section>
    </div>
  );
}
