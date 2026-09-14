'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '../../components/LocaleProvider';
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
  const { t } = useLocale();
  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="card empty-state">{t('common.loading')}</div>
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const { t } = useLocale();
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
      setError(t('auth.linkExpired'));
    } else if (linkError === 'invalid_link') {
      setError(t('auth.invalidLink'));
    }
  }, [searchParams, t]);

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
        setError(t('auth.needNames'));
        return;
      }
      if (!phoneValue) {
        setError(t('auth.needPhone'));
        return;
      }
      if (!/^[a-z0-9._-]{3,20}$/.test(publicId)) {
        setError(t('auth.usernameInvalid'));
        return;
      }
      if (password !== passwordConfirm) {
        setError(t('auth.passwordMismatch'));
        return;
      }

      const [{ data: takenByUsername }, { data: takenByDisplay }] = await Promise.all([
        supabase.from('profiles').select('id').eq('username', publicId).maybeSingle(),
        supabase.from('profiles').select('id').eq('display_name', publicId).maybeSingle(),
      ]);
      if (takenByUsername?.id || takenByDisplay?.id) {
        setError(t('auth.usernameTaken'));
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
      setMessage(t('auth.otpSent', { email }));
    } catch (err) {
      setError(err.message || t('auth.signupFailed'));
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
      setError(t('auth.otpInvalid'));
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
      setError(err.message || t('auth.otpWrong'));
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
      setMessage(t('auth.otpResent', { email }));
    } catch (err) {
      setError(err.message || t('auth.otpResendFailed'));
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
        <h2 className="section-title">{t('auth.verifyTitle')}</h2>
        <form className="card form-card" onSubmit={handleVerifyOtp}>
          <p className="hint-text">{message || t('auth.otpSentShort', { email })}</p>

          <label htmlFor="otp">{t('auth.otpLabel')}</label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />

          {error ? <div className="error-text">{error}</div> : null}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? t('auth.verifying') : t('auth.verifyDone')}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={handleResendCode}
            disabled={resending}
          >
            {resending ? t('auth.resending') : t('auth.resendCode')}
          </button>
          <button className="btn btn-outline" type="button" onClick={handleBackToForm}>
            {t('auth.backToSignup')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="section-title">{t('auth.signupTitle')}</h2>
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-row-2">
          <div>
            <label htmlFor="firstName">{t('auth.firstName')}</label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <label htmlFor="lastName">{t('auth.lastName')}</label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
        </div>

        <label htmlFor="phone">{t('auth.phone')}</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder=""
          autoComplete="tel"
          required
        />

        <label htmlFor="email">{t('auth.email')}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="username">{t('auth.username')}</label>
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
        <p className="field-help">{t('auth.usernameHelp')}</p>

        <label htmlFor="password">{t('auth.password')}</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        <label htmlFor="passwordConfirm">{t('auth.passwordConfirm')}</label>
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
          {saving ? t('auth.signingUp') : t('auth.signup')}
        </button>
        <p className="hint-text" style={{ marginTop: 14 }}>
          {t('auth.hasAccount')} <Link href="/login">{t('auth.login')}</Link>
        </p>
      </form>
    </div>
  );
}
