'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { SELLER_STATUS_LABEL } from '../../../lib/sellerConstants';

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
    let review_notes = '';
    if (status === 'rejected') {
      review_notes = window.prompt('거절 사유') || '';
      if (!review_notes.trim()) {
        setError('거절 사유를 입력해 주세요.');
        return;
      }
    }
    setBusyId(id);
    setError('');
    try {
      const res = await fetch('/api/admin/sellers', {
        method: 'PATCH',
        headers: await headers(),
        body: JSON.stringify({ id, status, review_notes, keep_plan: true }),
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

  async function openDocument(id) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/sellers?doc=${encodeURIComponent(id)}`, {
        headers: await headers(),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '서류 열기 실패');
      if (!payload.url) throw new Error('서명 URL을 받지 못했습니다.');
      window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('ko-KR');
    } catch {
      return '—';
    }
  }

  return (
    <div>
      <h3 className="section-title">사업자 입점 승인 · 튤립가게</h3>
      <p className="hint-text" style={{ marginBottom: 14 }}>
        EIN·주소·서류는 관리자만 볼 수 있습니다. 승인 즉시 상품 등록이 가능하며, 구독 결제는 판매자가
        이후에 진행합니다.
      </p>
      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="hint-text">불러오는 중…</div> : null}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>신청일</th>
              <th>사업자명</th>
              <th>EIN</th>
              <th>사업자 주소</th>
              <th>서류</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="hint-text">{formatDate(s.created_at)}</td>
                <td>
                  <strong>{s.business_name}</strong>
                  <div className="hint-text">{s.city || '—'}</div>
                  {s.review_notes ? (
                    <div className="hint-text" style={{ color: '#c04545' }}>
                      메모: {s.review_notes}
                    </div>
                  ) : null}
                </td>
                <td>
                  <code>{s.ein || '—'}</code>
                </td>
                <td className="hint-text">{s.business_address || '—'}</td>
                <td>
                  {s.sos_document_path ? (
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busyId === s.id}
                      onClick={() => openDocument(s.id)}
                    >
                      서류 보기
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{SELLER_STATUS_LABEL[s.status] || s.status}</td>
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
