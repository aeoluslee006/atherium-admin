'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminShopPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('pending');

  async function headers() {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    };
  }

  async function load(status = filter) {
    setLoading(true);
    setError('');
    try {
      const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
      const res = await fetch(`/api/admin/shop${qs}`, { headers: await headers() });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '불러오기 실패');
      setRows(payload.listings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(id, status) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: await headers(),
        body: JSON.stringify({ id, status }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '업데이트 실패');
      if (filter === 'all') {
        setRows((prev) => prev.map((r) => (r.id === id ? payload.listing : r)));
      } else {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div>
          <h3 className="section-title">튤립가게 승인</h3>
          <p className="hint-text">
            승인 시 trial_ends_at = 승인일 + 3개월. 앱 결제 없음 · 입점 월 $10 (무료 기간 후).
          </p>
        </div>
        <Link href="/shop" className="btn btn-outline">
          가게 보기
        </Link>
      </div>

      <div className="gift-cats" style={{ marginBottom: 14 }}>
        {[
          ['pending', '대기'],
          ['approved', '승인됨'],
          ['all', '전체'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`gift-cat-chip${filter === value ? ' is-active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="hint-text">불러오는 중…</div> : null}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>상품</th>
              <th>가격</th>
              <th>문의</th>
              <th>상태</th>
              <th>무료기간</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.business_name}</strong>
                  <div className="hint-text">
                    {[row.city, row.category].filter(Boolean).join(' · ')}
                  </div>
                  <div className="hint-text" style={{ maxWidth: 280 }}>
                    {(row.description || '').slice(0, 80)}
                  </div>
                </td>
                <td>{row.price_text || '—'}</td>
                <td className="hint-text">{row.contact || '—'}</td>
                <td>{row.status}</td>
                <td className="hint-text">
                  {row.trial_ends_at
                    ? new Date(row.trial_ends_at).toLocaleDateString('ko-KR')
                    : '—'}
                </td>
                <td>
                  <div className="admin-actions">
                    {row.status !== 'approved' ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={busyId === row.id}
                        onClick={() => setStatus(row.id, 'approved')}
                      >
                        승인(+3개월)
                      </button>
                    ) : null}
                    {row.status !== 'pending' ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={busyId === row.id}
                        onClick={() => setStatus(row.id, 'pending')}
                      >
                        대기로
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busyId === row.id}
                      onClick={() => setStatus(row.id, 'rejected')}
                    >
                      거절
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  목록이 비어 있습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
