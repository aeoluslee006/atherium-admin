'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CommentForm({ postId }) {
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
        setError('댓글을 쓰려면 로그인이 필요합니다.');
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
      setError(err.message || '댓글 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <label htmlFor="comment">댓글</label>
      <textarea
        id="comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        placeholder="댓글을 입력하세요"
      />
      {error ? <div className="error-text">{error}</div> : null}
      <button className="btn" type="submit" disabled={saving}>
        {saving ? '등록 중…' : '댓글 등록'}
      </button>
    </form>
  );
}
