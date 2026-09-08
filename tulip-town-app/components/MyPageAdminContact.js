'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatDateTime } from '../lib/memberTier';

function statusLabel(isRead) {
  return isRead ? '확인됨' : '대기중';
}

export default function MyPageAdminContact({ initialMessages = [] }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [messages, setMessages] = useState(() =>
    Array.isArray(initialMessages) ? initialMessages : []
  );

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('로그인이 필요합니다.');
      const res = await fetch('/api/admin-messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '전송 실패');
      const created = json.message || {};
      setMessages((prev) => [
        {
          id: created.id || `local-${Date.now()}`,
          message: message.trim(),
          is_read: false,
          created_at: created.created_at || new Date().toISOString(),
        },
        ...prev,
      ]);
      setMessage('');
      setOk('관리자에게 메시지를 보냈습니다.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mypage-grid-2">
      <section className="mypage-section card" aria-labelledby="mypage-contact-title">
        <div className="mypage-section-head">
          <h2 id="mypage-contact-title">관리자에게 문의</h2>
        </div>
        <p className="mypage-list-sub" style={{ marginBottom: 12 }}>
          문의 내용은 관리자 회원 목록에서 확인할 수 있습니다. (답장은 추후 지원)
        </p>
        <form onSubmit={submit}>
          <label htmlFor="admin-contact-msg">메시지</label>
          <textarea
            id="admin-contact-msg"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            required
          />
          {error ? <div className="error-text">{error}</div> : null}
          {ok ? <div className="hint-text">{ok}</div> : null}
          <button className="btn" type="submit" disabled={busy || !message.trim()}>
            {busy ? '보내는 중…' : '보내기'}
          </button>
        </form>
      </section>

      <section className="mypage-section card" aria-labelledby="mypage-contact-list-title">
        <div className="mypage-section-head">
          <h2 id="mypage-contact-list-title">문의 내역</h2>
          <span className="mypage-count">{messages.length}건</span>
        </div>
        {messages.length ? (
          <ul className="mypage-list">
            {messages.map((row) => (
              <li key={row.id} className="mypage-list-row mypage-list-row--stack">
                <div className="mypage-list-row" style={{ padding: 0, border: 0 }}>
                  <p className="mypage-comment-body">{row.message}</p>
                  <span
                    className={`mypage-status mypage-status--${row.is_read ? 'active' : 'expired'}`}
                  >
                    {statusLabel(row.is_read)}
                  </span>
                </div>
                <p className="mypage-list-sub">{formatDateTime(row.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mypage-empty">
            <p>보낸 문의가 없습니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
