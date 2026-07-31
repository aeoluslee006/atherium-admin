'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { CATEGORIES } from '../lib/categories';

const NAV_ICONS = {
  notice: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.6 1.4L5 14h14l-1.4-1.4a2 2 0 0 1-.6-1.4V8a5 5 0 0 0-5-5Z" />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </svg>
  ),
  guide: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </svg>
  ),
  free: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4V6Z" />
    </svg>
  ),
  qna: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.9" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  housing: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  market: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  jobs: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  directory: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="10" height="18" />
      <rect x="14" y="9" width="6" height="12" />
      <line x1="7" y1="7" x2="7" y2="7.01" />
      <line x1="7" y1="11" x2="7" y2="11.01" />
    </svg>
  ),
};

export default function Header() {
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-top">
          <Link href="/" className="brand-logo-link" aria-label="Tulip Town home">
            <img src="/logo.png" alt="Tulip Town" className="brand-logo" />
          </Link>

          <Link href="/" className="brand-text">
            <span className="brand-name">TULIP TOWN KOREAN COMMUNITY</span>
            <span className="brand-tagline">Serving Holland, Grand Rapids &amp; West Michigan</span>
          </Link>

          <div className="auth-area">
            {loaded && session ? (
              <>
                <span className="auth-email">{session.user.email}</span>
                <button type="button" onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            ) : loaded ? (
              <>
                <Link href="/login">로그인</Link>
                <Link href="/signup" className="signup-link">
                  회원가입
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <nav className="main-nav">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/board/${cat.slug}`} className="nav-item">
              <span className="nav-icon">{NAV_ICONS[cat.slug]}</span>
              <span>{cat.nameKo}</span>
            </Link>
          ))}
          <Link href="/directory" className="nav-item">
            <span className="nav-icon">{NAV_ICONS.directory}</span>
            <span>업체 디렉토리</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
