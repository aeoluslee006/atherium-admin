'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { TIER_META } from '../../../lib/memberTier';
import { MEMBER_STATUS_LABELS } from '../../../lib/memberStatus';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export default function AdminMembersPage() {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const [hasMessage, setHasMessage] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [promoDraft, setPromoDraft] = useState({});
  const [msgOpenId, setMsgOpenId] = useState('');
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams({
        q,
        page: String(page),
        limit: String(limit),
      });
      if (tier) params.set('tier', tier);
      if (status) params.set('status', status);
      if (hasMessage) params.set('has_message', '1');
      const res = await fetch(`/api/admin/members?${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '불러오기 실패');
      setRows(data.members || []);
      setTotal(data.total || 0);
      const drafts = {};
      for (const m of data.members || []) {
        drafts[m.id] = m.promo_end_date || '';
      }
      setPromoDraft(drafts);
      if (data.migration_needed) {
        setError('DB 마이그레이션(atherium_admin_members.sql)이 필요합니다.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, tier, status, hasMessage, page]);

  useEffect(() => {
    load();
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
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function openMessages(id) {
    setMsgOpenId(id);
    setMsgLoading(true);
    setMessages([]);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/admin/members/${id}/messages`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '메시지 불러오기 실패');
      setMessages(data.messages || []);
      await fetch(`/api/admin/members/${id}/messages`, {
        method: 'PATCH',
        headers,
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setMsgLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <p className="hint-text" style={{ marginBottom: 12 }}>
        ATHERIUM · 회원 라인 아이템. 홀드=Stripe pause + 유료 비노출 + 특별광고 반납. 삭제=soft delete +
        Stripe cancel.
      </p>

      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        style={{ flexWrap: 'wrap', gap: 8 }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="닉네임·이메일 검색"
          style={{ marginBottom: 0, minWidth: 180 }}
        />
        <select value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }} style={{ marginBottom: 0 }}>
          <option value="">등급 전체</option>
          {Object.entries(TIER_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.labelKo}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={{ marginBottom: 0 }}
        >
          <option value="">상태 전체</option>
          <option value="active">정상</option>
          <option value="hold">홀드</option>
          <option value="deleted">삭제됨</option>
        </select>
        <label className="admin-check" style={{ margin: 0 }}>
          <input
            type="checkbox"
            checked={hasMessage}
            onChange={(e) => {
              setHasMessage(e.target.checked);
              setPage(1);
            }}
          />
          메시지 있음
        </label>
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
              <th>등급</th>
              <th>닉네임</th>
              <th>이메일</th>
              <th>프로모션</th>
              <th>상태</th>
              <th>메시지</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const meta = TIER_META[row.tier] || TIER_META.bronze;
              const st = row.status || 'active';
              return (
                <tr key={row.id}>
                  <td>
                    <span className={meta.badgeClass}>{row.tier_label || meta.labelKo}</span>
                  </td>
                  <td>
                    {row.display_name || '—'}
                    {row.is_admin ? <span className="admin-chip">admin</span> : null}
                  </td>
                  <td>{row.email || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
                      <span className="hint-text">{row.promo_label || '미적용'}</span>
                      <input
                        type="date"
                        value={promoDraft[row.id] || ''}
                        disabled={busyId === row.id || row.is_admin}
                        onChange={(e) =>
                          setPromoDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        style={{ marginBottom: 0 }}
                      />
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={busyId === row.id || row.is_admin}
                        onClick={() =>
                          patchMember(row.id, {
                            promo_end_date: promoDraft[row.id] || null,
                          })
                        }
                      >
                        프로모션 저장
                      </button>
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        st === 'deleted'
                          ? 'status-bad'
                          : st === 'hold'
                            ? 'status-warn'
                            : 'status-ok'
                      }
                    >
                      {MEMBER_STATUS_LABELS[st] || st}
                    </span>
                  </td>
                  <td>
                    {row.unread_messages > 0 ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => openMessages(row.id)}
                      >
                        안 읽음 {row.unread_messages}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => openMessages(row.id)}
                      >
                        보기
                      </button>
                    )}
                  </td>
                  <td className="admin-actions">
                    {st !== 'hold' ? (
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={busyId === row.id || row.is_admin || st === 'deleted'}
                        onClick={() => {
                          if (!window.confirm('홀드할까요? (과금 pause · 유료 비노출 · 특별광고 반납)')) return;
                          patchMember(row.id, { status: 'hold' });
                        }}
                      >
                        홀드
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={busyId === row.id || row.is_admin}
                        onClick={() => {
                          if (!window.confirm('홀드를 해제할까요? (Stripe resume · 특별광고는 재신청 필요)'))
                            return;
                          patchMember(row.id, { status: 'active' });
                        }}
                      >
                        홀드 해제
                      </button>
                    )}
                    {st !== 'deleted' ? (
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={busyId === row.id || row.is_admin}
                        onClick={() => {
                          if (
                            !window.confirm(
                              '계정을 삭제(soft)할까요? Stripe 구독 즉시 취소 · 유료 비노출 · 특별광고 반납'
                            )
                          )
                            return;
                          patchMember(row.id, { status: 'deleted' });
                        }}
                      >
                        삭제
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  회원이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="row-between" style={{ marginTop: 12 }}>
        <span className="hint-text">
          {total}명 · {page}/{totalPages}페이지
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            이전
          </button>
          <button
            className="btn btn-outline"
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </div>
      </div>

      {msgOpenId ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <strong>관리자 메시지</strong>
            <button className="btn btn-outline" type="button" onClick={() => setMsgOpenId('')}>
              닫기
            </button>
          </div>
          {msgLoading ? <div className="hint-text">불러오는 중…</div> : null}
          {!msgLoading && !messages.length ? (
            <p className="hint-text">메시지가 없습니다.</p>
          ) : null}
          <ul className="mypage-list">
            {messages.map((m) => (
              <li key={m.id} className="mypage-list-row mypage-list-row--stack">
                <p className="mypage-comment-body">{m.message}</p>
                <p className="mypage-list-sub">
                  {new Date(m.created_at).toLocaleString('ko-KR')}
                  {m.is_read ? '' : ' · 새 메시지'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
