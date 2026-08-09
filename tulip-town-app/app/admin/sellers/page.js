'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { SELLER_STATUS_LABEL, SUB_STATUS_LABEL } from '../../../lib/sellerConstants';

export default function AdminSellersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

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
      const res = await fetch('/api/admin/sellers', { headers: await headers() });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '불러오기 실패');
      setRows(payload.sellers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id, status) {
    let rejection_reason = '';
    if (status === 'rejected') {
      rejection_reason = window.prompt('거절 사유 (선택)') || '';
    }
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/sellers', {
        method: 'PATCH',
        headers: await headers(),
        body: JSON.stringify({ id, status, rejection_reason }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '업데이트 실패');
      setRows((prev) => prev.map((r) => (r.id === id ? payload.seller : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div>
      <h3 className="section-title">판매자 승인 · 튤립가게</h3>
      <p className="hint-text" style={{ marginBottom: 14 }}>
        개인 판매자도 승인 가능. 승인 후 판매자가 $15 구독·Connect 계좌를 연결합니다.
      </p>
      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="hint-text">불러오는 중…</div> : null}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>상점</th>
              <th>유형</th>
              <th>연락</th>
              <th>상태</th>
              <th>구독</th>
              <th>정산</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.shop_name}</strong>
                  <div className="hint-text">{s.contact_name} · {s.city}</div>
                  <div className="hint-text">{s.bio}</div>
                </td>
                <td>{s.seller_type === 'business' ? '사업자' : '개인'}</td>
                <td>
                  <div className="hint-text">{s.phone}</div>
                  <div className="hint-text">{s.email}</div>
                </td>
                <td>{SELLER_STATUS_LABEL[s.status] || s.status}</td>
                <td>{SUB_STATUS_LABEL[s.subscription_status] || s.subscription_status}</td>
                <td>{s.charges_enabled ? 'OK' : '—'}</td>
                <td>
                  <div className="admin-actions">
                    {s.status !== 'approved' ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={busyId === s.id}
                        onClick={() => setStatus(s.id, 'approved')}
                      >
                        승인
                      </button>
                    ) : null}
                    {s.status !== 'rejected' ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={busyId === s.id}
                        onClick={() => setStatus(s.id, 'rejected')}
                      >
                        거절
                      </button>
                    ) : null}
                    {s.status === 'approved' ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={busyId === s.id}
                        onClick={() => setStatus(s.id, 'suspended')}
                      >
                        정지
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  신청이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
