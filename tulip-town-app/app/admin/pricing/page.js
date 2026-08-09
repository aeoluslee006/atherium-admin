'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function AdminPricingPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingKey, setSavingKey] = useState('');

  async function load() {
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/pricing', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '불러오기 실패');
      setRows(data.settings || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateLocal(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function save(row) {
    setSavingKey(row.key);
    setError('');
    setMessage('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/pricing', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          key: row.key,
          amount_cents: Number(row.amount_cents),
          is_active: !!row.is_active,
          label: row.label,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      setMessage('저장되었습니다.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey('');
    }
  }

  return (
    <div>
      <p className="hint-text" style={{ marginBottom: 14 }}>
        업체 디렉토리 월 구독료는 Stripe Checkout에 사용됩니다. (금액 단위: cents)
      </p>
      {error ? <div className="error-text">{error}</div> : null}
      {message ? <div className="hint-text">{message}</div> : null}

      {rows.map((row) => (
        <div key={row.key} className="card form-card" style={{ marginBottom: 16 }}>
          <div className="ko" style={{ fontWeight: 700, marginBottom: 8 }}>
            {row.key}
          </div>
          <label>라벨</label>
          <input value={row.label || ''} onChange={(e) => updateLocal(row.key, { label: e.target.value })} />
          <label>금액 (cents) — $15 = 1500</label>
          <input
            type="number"
            min="0"
            value={row.amount_cents ?? 0}
            onChange={(e) => updateLocal(row.key, { amount_cents: e.target.value })}
          />
          <label className="admin-check">
            <input
              type="checkbox"
              checked={!!row.is_active}
              onChange={(e) => updateLocal(row.key, { is_active: e.target.checked })}
            />
            활성화 (is_active)
          </label>
          <button className="btn" type="button" disabled={savingKey === row.key} onClick={() => save(row)}>
            {savingKey === row.key ? '저장 중…' : '저장'}
          </button>
        </div>
      ))}

      {!rows.length ? <div className="card empty-state">요금 설정이 없습니다.</div> : null}
    </div>
  );
}
