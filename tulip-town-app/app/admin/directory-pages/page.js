'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDirectoryCategoryLabel } from '../../../lib/directoryCategories';
import {
  DIRECTORY_GRID_COLS,
  DIRECTORY_GRID_ROWS,
  formatSlotPrice,
  groupSlotsByPage,
  sizeTierLabel,
} from '../../../lib/directorySlots';
import { supabase } from '../../../lib/supabaseClient';

function activeAd(slot) {
  const ads = slot.directory_slot_ads;
  const list = Array.isArray(ads) ? ads : ads ? [ads] : [];
  return list.find((a) => a && a.status === 'active') || null;
}

export default function AdminDirectoryPages() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [page, setPage] = useState(1);

  async function headers() {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    };
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/directory-pages', { headers: await headers() });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '불러오기 실패');
      setSlots(payload.slots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pages = useMemo(() => groupSlotsByPage(slots), [slots]);
  const pageNumbers = pages.map((p) => p.pageNumber);
  const current = pages.find((p) => p.pageNumber === page) || pages[0];

  useEffect(() => {
    if (pageNumbers.length && !pageNumbers.includes(page)) {
      setPage(pageNumbers[0]);
    }
  }, [pageNumbers, page]);

  async function addPage() {
    setBusy('add');
    setError('');
    try {
      const res = await fetch('/api/admin/directory-pages', {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ action: 'add_page' }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '페이지 추가 실패');
      await load();
      if (payload.page_number) setPage(payload.page_number);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function updatePrice(slotId, cents) {
    setBusy(slotId);
    setError('');
    try {
      const res = await fetch('/api/admin/directory-pages', {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ action: 'update_price', slot_id: slotId, base_price_cents: cents }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '가격 수정 실패');
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, ...payload.slot } : s)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function forceRemove(adId) {
    if (!window.confirm('이 광고를 강제 삭제하고 자리를 비울까요? 구독도 취소됩니다.')) return;
    setBusy(adId);
    setError('');
    try {
      const res = await fetch('/api/admin/directory-pages', {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ action: 'force_remove_ad', ad_id: adId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '삭제 실패');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div>
          <h3 className="section-title">지면 광고 관리</h3>
          <p className="hint-text">점유/빈자리 현황, 가격 조정, 페이지 추가, 부적절 광고 강제 삭제</p>
        </div>
        <button type="button" className="btn" disabled={busy === 'add'} onClick={addPage}>
          {busy === 'add' ? '추가 중…' : '페이지 추가'}
        </button>
      </div>

      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="hint-text">불러오는 중…</div> : null}

      <div className="dir-pages-nav" style={{ marginBottom: 12 }}>
        {pageNumbers.map((n) => (
          <button
            key={n}
            type="button"
            className={`dir-pages-tab${n === page ? ' is-active' : ''}`}
            onClick={() => setPage(n)}
          >
            {n}면
          </button>
        ))}
      </div>

      {current ? (
        <div
          className="dir-paper admin-dir-paper"
          style={{ '--dir-cols': DIRECTORY_GRID_COLS, '--dir-rows': DIRECTORY_GRID_ROWS }}
        >
          <div className="dir-grid">
            {(current.slots || []).map((slot) => {
              const ad = activeAd(slot);
              const occupied = slot.status === 'occupied' && ad;
              return (
                <div
                  key={slot.id}
                  className={`dir-cell ${occupied ? 'is-occupied' : 'is-empty'}`}
                  style={{
                    gridColumn: `${(slot.col_index || 0) + 1} / span ${slot.span_cols || 1}`,
                    gridRow: `${(slot.row_index || 0) + 1} / span ${slot.span_rows || 1}`,
                  }}
                >
                  {occupied ? (
                    <div className="dir-ad">
                      <div className="dir-ad-title">{ad.ad_title}</div>
                      <div className="dir-ad-cat">{getDirectoryCategoryLabel(ad.category_slug)}</div>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ marginTop: 6, fontSize: 11, padding: '4px 8px' }}
                        disabled={busy === ad.id}
                        onClick={() => forceRemove(ad.id)}
                      >
                        강제 삭제
                      </button>
                    </div>
                  ) : (
                    <div className="dir-empty-label">
                      {slot.position_label}
                      <div className="hint-text">{formatSlotPrice(slot.base_price_cents)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 16, overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>페이지</th>
              <th>위치</th>
              <th>크기</th>
              <th>상태</th>
              <th>가격(¢)</th>
              <th>광고</th>
            </tr>
          </thead>
          <tbody>
            {(current?.slots || []).map((slot) => {
              const ad = activeAd(slot);
              return (
                <tr key={slot.id}>
                  <td>{slot.page_number}</td>
                  <td>{slot.position_label}</td>
                  <td>{sizeTierLabel(slot.size_tier)}</td>
                  <td>{slot.status}</td>
                  <td>
                    <input
                      type="number"
                      defaultValue={slot.base_price_cents}
                      style={{ width: 100 }}
                      onBlur={(e) => {
                        const next = Math.round(Number(e.target.value));
                        if (Number.isFinite(next) && next !== slot.base_price_cents) {
                          updatePrice(slot.id, next);
                        }
                      }}
                    />
                  </td>
                  <td>{ad ? ad.ad_title : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
