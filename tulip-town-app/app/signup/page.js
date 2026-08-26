'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    const first = firstName.trim();
    const last = lastName.trim();
    const phoneValue = phone.trim();
    const publicId = normalizeUsername(username);

    try {
      if (!first || !last) {
        setError('First name과 Last name을 모두 입력해 주세요.');
        return;
      }
      if (!phoneValue) {
        setError('전화번호를 입력해 주세요.');
        return;
      }
      if (!/^[a-z0-9._-]{3,20}$/.test(publicId)) {
        setError('아이디는 영문 소문자/숫자/._- 3~20자로 입력해 주세요.');
        return;
      }
      if (password !== passwordConfirm) {
        setError('비밀번호 확인이 일치하지 않습니다.');
        return;
      }

      const [{ data: takenByUsername }, { data: takenByDisplay }] = await Promise.all([
        supabase.from('profiles').select('id').eq('username', publicId).maybeSingle(),
        supabase.from('profiles').select('id').eq('display_name', publicId).maybeSingle(),
      ]);
      if (takenByUsername?.id || takenByDisplay?.id) {
        setError('이미 사용 중인 아이디입니다.');
        return;
      }

      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: first,
            last_name: last,
            phone: phoneValue,
            username: publicId,
            display_name: publicId,
          },
        },
      });
      if (signError) throw signError;

      if (data.user) {
        const fullProfile = {
          id: data.user.id,
          email,
          phone: phoneValue,
          first_name: first,
          last_name: last,
          username: publicId,
          display_name: publicId,
        };
        const { error: profileError } = await supabase.from('profiles').upsert(fullProfile);
        if (profileError) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            phone: phoneValue,
            display_name: publicId,
          });
        }
      }

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
        <div className="form-row-2">
          <div>
            <label htmlFor="firstName">First name · 이름</label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <label htmlFor="lastName">Last name · 성</label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
        </div>

        <label htmlFor="phone">전화번호</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder=""
          autoComplete="tel"
          required
        />

        <label htmlFor="email">이메일</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="username">아이디</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder=""
          autoComplete="username"
          minLength={3}
          maxLength={20}
          required
        />
        <p className="field-help">글을 올릴 때 이 아이디가 공개됩니다. (로그인 이메일이 아닙니다)</p>

        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        <label htmlFor="passwordConfirm">비밀번호 확인</label>
        <input
          id="passwordConfirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          autoComplete="new-password"
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
