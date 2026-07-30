'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const { data, error: signError } = await supabase.auth.signUp({ email, password });
      if (signError) throw signError;
      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        setMessage('가입 확인 메일을 보냈습니다. 이메일을 확인해주세요.');
      }
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <h2 className="section-title">회원가입 · Sign up</h2>
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
          minLength={6}
          required
        />
        {error ? <div className="error-text">{error}</div> : null}
        {message ? <div className="hint-text">{message}</div> : null}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? '가입 중…' : '회원가입'}
        </button>
        <p className="hint-text" style={{ marginTop: 14 }}>
          이미 계정이 있나요? <Link href="/login">로그인</Link>
        </p>
      </form>
    </div>
  );
}
