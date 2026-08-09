'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function AdminMembersPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/admin/members?q=${encodeURIComponent(query)}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '불러오기 실패');
      setRows(data.members || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  async function patchMember(id, body) {
    setBusyId(id);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '업데이트 실패');
      await load(q);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  function handleBan(row) {
    const reason = window.prompt('강제 퇴출 사유를 입력하세요', row.banned_reason || '');
    if (reason === null) return;
    patchMember(row.id, { is_banned: true, banned_reason: reason, suspended_until: null });
  }

  function handleSuspend(row) {
    const days = window.prompt('정지 일수 (예: 7)', '7');
    if (days === null) return;
    const n = Number(days);
    if (!Number.isFinite(n) || n <= 0) {
      setError('올바른 일수를 입력하세요.');
      return;
    }
    const until = new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
    patchMember(row.id, { suspended_until: until, is_banned: false });
  }

  function handleClear(row) {
    if (!window.confirm('정지/퇴출을 해제할까요?')) return;
    patchMember(row.id, { is_banned: false, banned_reason: null, suspended_until: null });
  }

  return (
    <div>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이메일 / 닉네임 검색"
          style={{ marginBottom: 0 }}
        />
        <button className="btn" type="submit">
          검색
        </button>
      </form>

      {error ? <div className="error-text">{error}</div> : null}
      {loading ? <div className="hint-text">불러오는 중…</div> : null}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>닉네임</th>
              <th>이메일</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const suspended =
                row.suspended_until && new Date(row.suspended_until).getTime() > Date.now();
              return (
                <tr key={row.id}>
                  <td>
                    {row.display_name || '—'}
                    {row.is_admin ? <span className="admin-chip">admin</span> : null}
                  </td>
                  <td>{row.email || '—'}</td>
                  <td>
                    {row.is_banned ? (
                      <span className="status-bad">퇴출{row.banned_reason ? `: ${row.banned_reason}` : ''}</span>
                    ) : suspended ? (
                      <span className="status-warn">
                        정지 ~ {new Date(row.suspended_until).toLocaleDateString('ko-KR')}
                      </span>
                    ) : (
                      <span className="status-ok">정상</span>
                    )}
                  </td>
                  <td className="admin-actions">
                    <button
                      className="btn btn-outline"
                      type="button"
                      disabled={busyId === row.id || row.is_admin}
                      onClick={() => handleSuspend(row)}
                    >
                      정지
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      disabled={busyId === row.id || row.is_admin}
                      onClick={() => handleBan(row)}
                    >
                      퇴출
                    </button>
                    <button
                      className="btn btn-outline"
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => handleClear(row)}
                    >
                      해제
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={4} className="empty-state">
                  회원이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
