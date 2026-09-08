'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
  centsToDollarInput,
  displayLabelForPricingRow,
  dollarsToCents,
  groupPricingSettings,
} from '../../../lib/pricingAdminUi';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export default function AdminPricingPage() {
  const [rows, setRows] = useState([]);
  const [dollarDraft, setDollarDraft] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [openGroups, setOpenGroups] = useState({
    directory: true,
    tulip: true,
    legacy_seller: false,
    other: false,
  });

  async function load() {
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/pricing', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '불러오기 실패');
      const settings = data.settings || [];
      setRows(settings);
      const dollars = {};
      for (const r of settings) {
        dollars[r.key] = centsToDollarInput(r.amount_cents);
      }
      setDollarDraft(dollars);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => groupPricingSettings(rows), [rows]);

  function updateLocal(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function save(row) {
    setSavingKey(row.key);
    setError('');
    setMessage('');
    try {
      const cents = dollarsToCents(dollarDraft[row.key]);
      if (cents == null) throw new Error('금액($)을 올바르게 입력해 주세요.');
      const headers = await authHeaders();
      const res = await fetch('/api/admin/pricing', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          key: row.key,
          amount_cents: cents,
          is_active: !!row.is_active,
          label: row.label,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장 실패');
      setMessage(`${displayLabelForPricingRow(row)} 저장됨 ($${centsToDollarInput(cents)})`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey('');
    }
  }

  return (
    <div>
      {error ? <div className="error-text">{error}</div> : null}
      {message ? <div className="hint-text">{message}</div> : null}

      {groups.map((group) => {
        const open = openGroups[group.id] !== false;
        return (
          <section key={group.id} className="card" style={{ marginBottom: 16, padding: 0 }}>
            <button
              type="button"
              className="row-between"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !open }))}
            >
              <strong>{group.title}</strong>
              <span className="hint-text">{open ? '접기' : '펼치기'} · {group.items.length}개</span>
            </button>
            {open ? (
              <div
                style={{
                  padding: '0 16px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {group.items.map((row) => {
                  const isLegacyListing = row.key === 'directory_listing';
                  const hint = group.hints?.[row.key];
                  return (
                    <div key={row.key} className="form-card" style={{ marginBottom: 0 }}>
                      <div className="ko" style={{ fontWeight: 700, marginBottom: 4 }}>
                        {displayLabelForPricingRow(row)}
                      </div>
                      <div className="hint-text" style={{ marginBottom: 8 }}>
                        {row.key}
                        {isLegacyListing ? ' · 레거시(미사용)' : ''}
                        {hint ? ` · ${hint}` : ''}
                      </div>
                      <label>표시 라벨</label>
                      <input
                        value={row.label || ''}
                        onChange={(e) => updateLocal(row.key, { label: e.target.value })}
                      />
                      <label>금액 ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dollarDraft[row.key] ?? ''}
                        onChange={(e) =>
                          setDollarDraft((prev) => ({ ...prev, [row.key]: e.target.value }))
                        }
                      />
                      <label className="admin-check">
                        <input
                          type="checkbox"
                          checked={!!row.is_active}
                          onChange={(e) => updateLocal(row.key, { is_active: e.target.checked })}
                        />
                        활성화 (is_active)
                      </label>
                      <button
                        className="btn"
                        type="button"
                        disabled={savingKey === row.key}
                        onClick={() => save(row)}
                      >
                        {savingKey === row.key ? '저장 중…' : '저장'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}

      {!rows.length ? <div className="card empty-state">요금 설정이 없습니다.</div> : null}
    </div>
  );
}
