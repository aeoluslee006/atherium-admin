'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { IconMail } from './MyPageIcons';

export default function MyPageAdminContact() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

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
      setMessage('');
      setOk('관리자에게 메시지를 보냈습니다.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="mypage-contact" className="mypage-section card" aria-labelledby="mypage-contact-title">
      <details className="mypage-details mypage-details--bare">
        <summary id="mypage-contact-title">
          <span className="mypage-section-icon" aria-hidden="true">
            <IconMail />
          </span>
          관리자에게 문의
        </summary>
        <p className="mypage-list-sub" style={{ marginBottom: 12 }}>
          문의 내용은 관리자가 확인합니다. (답장 기능은 추후 지원)
        </p>
        <form onSubmit={submit}>
          <label htmlFor="admin-contact-msg">메시지</label>
          <textarea
            id="admin-contact-msg"
            rows={3}
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
      </details>
    </section>
  );
}
