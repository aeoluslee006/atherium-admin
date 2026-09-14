'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '../../components/LocaleProvider';
import { supabase } from '../../lib/supabaseClient';

function LoginForm() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
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
      router.push(next.startsWith('/') ? next : '/');
      router.refresh();
    } catch (err) {
      setError(err.message || t('auth.loginFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <label htmlFor="email">{t('auth.email')}</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="password">{t('auth.password')}</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? <div className="error-text">{error}</div> : null}
      <button className="btn" type="submit" disabled={saving}>
        {saving ? t('auth.loggingIn') : t('auth.login')}
      </button>
      <p className="hint-text" style={{ marginTop: 14 }}>
        {t('auth.noAccount')} <Link href="/signup">{t('auth.signup')}</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  const { t } = useLocale();
  return (
    <div className="container">
      <h2 className="section-title">{t('auth.loginTitle')}</h2>
      <Suspense fallback={<div className="card empty-state">{t('common.loading')}</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
