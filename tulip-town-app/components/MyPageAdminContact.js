'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { IconMail } from './MyPageIcons';
import { useLocale } from './LocaleProvider';

export default function MyPageAdminContact() {
  const { t } = useLocale();
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
      if (!token) throw new Error(t('mypage.needLogin'));
      const res = await fetch('/api/admin-messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t('mypage.adminContactFail'));
      setMessage('');
      setOk(t('mypage.adminContactSent'));
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
          {t('mypage.adminContactTitle')}
        </summary>
        <p className="mypage-list-sub" style={{ marginBottom: 12 }}>
          {t('mypage.adminContactHint')}
        </p>
        <form onSubmit={submit}>
          <label htmlFor="admin-contact-msg">{t('mypage.adminContactMessage')}</label>
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
            {busy ? t('mypage.adminContactSending') : t('mypage.adminContactSend')}
          </button>
        </form>
      </details>
    </section>
  );
}
