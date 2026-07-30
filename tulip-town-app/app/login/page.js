'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) throw signError;
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <h2 className="section-title">로그인 · Login</h2>
      <form className="card form-card" onSubmit={handleSubmit}>
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <div className="error-text">{error}</div> : null}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? '로그인 중…' : '로그인'}
        </button>
        <p className="hint-text" style={{ marginTop: 14 }}>
          계정이 없나요? <Link href="/signup">회원가입</Link>
        </p>
      </form>
    </div>
  );
}
