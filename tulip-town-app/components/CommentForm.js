'use client';

import { useState } from 'react';
import { useLocale } from './LocaleProvider';
import { supabase } from '../lib/supabaseClient';

export default function CommentForm({ postId }) {
  const { t, locale } = useLocale();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError(t('comment.loginRequired'));
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, banned_reason, suspended_until')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();
      if (profile?.is_banned) {
        setError(profile.banned_reason || t('comment.banned'));
        return;
      }
      if (profile?.suspended_until && new Date(profile.suspended_until).getTime() > Date.now()) {
        const until = new Date(profile.suspended_until).toLocaleString(
          locale === 'en' ? 'en-US' : 'ko-KR'
        );
        setError(t('comment.suspended', { date: until }));
        return;
      }
      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        body,
        author_id: sessionData.session.user.id,
      });
      if (insertError) throw insertError;
      setBody('');
      window.location.reload();
    } catch (err) {
      setError(err.message || t('comment.fail'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <label htmlFor="comment">{t('comment.label')}</label>
      <textarea
        id="comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      {error ? <div className="error-text">{error}</div> : null}
      <button className="btn" type="submit" disabled={saving}>
        {saving ? t('comment.submitting') : t('comment.submit')}
      </button>
    </form>
  );
}
