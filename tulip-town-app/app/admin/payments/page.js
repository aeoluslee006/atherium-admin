'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function statusClass(status) {
  if (status === 'failed' || status === 'past_due') return 'status-bad';
  if (status === 'canceled') return 'status-warn';
  if (status === 'active') return 'status-ok';
  return '';
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const headers = await authHeaders();
        const res = await fetch('/api/admin/payments', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '불러오기 실패');
        setRows(data.payments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ordered = useMemo(() => {
    const rank = { failed: 0, past_due: 1, pending: 2, active: 3, canceled: 4 };
    return [...rows].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
  }, [rows]);

  return (
    <div>
      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="hint-text">불러오는 중…</div> : null}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>스폰서</th>
              <th>상태</th>
              <th>금액</th>
              <th>다음 결제일</th>
              <th>Stripe</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((p) => (
              <tr key={p.id} className={p.status === 'failed' || p.status === 'past_due' ? 'row-alert' : ''}>
                <td>{p.sponsor_name || p.sponsor_id || '—'}</td>
                <td>
                  <span className={statusClass(p.status)}>{p.status}</span>
                </td>
                <td>
                  {typeof p.amount_cents === 'number'
                    ? `$${(p.amount_cents / 100).toFixed(2)} ${((p.currency || 'usd') + '').toUpperCase()}`
                    : '—'}
                </td>
                <td>
                  {p.current_period_end
                    ? new Date(p.current_period_end).toLocaleString('ko-KR')
                    : '—'}
                </td>
                <td className="hint-text" style={{ fontSize: 11 }}>
                  {p.stripe_subscription_id || p.stripe_customer_id || '—'}
                </td>
              </tr>
            ))}
            {!loading && !ordered.length ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  결제 기록이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
