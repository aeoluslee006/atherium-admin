'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

async function upsertProfile(userId, profile) {
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    ...profile,
  });
  if (profileError) {
    await supabase.from('profiles').upsert({
      id: userId,
      email: profile.email,
      phone: profile.phone,
      display_name: profile.display_name,
    });
  }
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container"><div className="card empty-state">로딩 중…</div></div>}>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingProfile, setPendingProfile] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const linkError = searchParams.get('error');
    if (linkError === 'link_expired') {
      setError('인증 링크가 만료되었거나 이미 사용되었습니다. 아래에서 인증 코드를 다시 받아 주세요.');
    } else if (linkError === 'invalid_link') {
      setError('유효하지 않은 인증 링크입니다. 인증 코드로 다시 시도해 주세요.');
    }
  }, [searchParams]);

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

      const profilePayload = {
        email,
        phone: phoneValue,
        first_name: first,
        last_name: last,
        username: publicId,
        display_name: publicId,
      };

      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/confirm` : undefined;

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
          emailRedirectTo: redirectTo,
        },
      });
      if (signError) throw signError;

      if (data.user) {
        await upsertProfile(data.user.id, profilePayload);
      }

      if (data.session) {
        router.push('/');
        router.refresh();
        return;
      }

      setPendingUserId(data.user?.id || null);
      setPendingProfile(profilePayload);
      setOtp('');
      setStep('verify');
      setMessage(`${email}(으)로 인증 코드(6자리)를 보냈습니다. 아래에 입력해 주세요.`);
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    const code = otp.replace(/\D/g, '');
    if (code.length !== 6) {
      setError('6자리 인증 코드를 입력해 주세요.');
      setSaving(false);
      return;
    }

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });
      if (verifyError) throw verifyError;

      const userId = data.user?.id || pendingUserId;
      if (userId && pendingProfile) {
        await upsertProfile(userId, pendingProfile);
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message || '인증 코드가 올바르지 않거나 만료되었습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResendCode() {
    setError('');
    setMessage('');
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) throw resendError;
      setMessage(`${email}(으)로 인증 코드를 다시 보냈습니다.`);
    } catch (err) {
      setError(err.message || '인증 코드 재전송에 실패했습니다.');
    } finally {
      setResending(false);
    }
  }

  function handleBackToForm() {
    setStep('form');
    setOtp('');
    setError('');
    setMessage('');
  }

  if (step === 'verify') {
    return (
      <div className="container">
        <h2 className="section-title">이메일 인증 · Verify email</h2>
        <form className="card form-card" onSubmit={handleVerifyOtp}>
          <p className="hint-text">{message || `${email}(으)로 인증 코드(6자리)를 보냈습니다.`}</p>

          <label htmlFor="otp">인증 코드</label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            required
          />

          {error ? <div className="error-text">{error}</div> : null}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? '확인 중…' : '인증 완료'}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={handleResendCode}
            disabled={resending}
          >
            {resending ? '재전송 중…' : '코드 다시 받기'}
          </button>
          <button className="btn btn-outline" type="button" onClick={handleBackToForm}>
            ← 회원가입으로 돌아가기
          </button>
        </form>
      </div>
    );
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
          placeholder="예: 616-555-0100"
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
          placeholder="영문 소문자/숫자 3~20자"
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
