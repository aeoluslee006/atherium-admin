'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  news: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5Z" />
      <path d="M18 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4" />
      <path d="M7 9h7" />
      <path d="M7 13h7" />
      <path d="M7 17h4" />
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
  clubs: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.5 19" />
      <path d="M13 15.2c1.2-.7 2.6-1 4-.8 2 .3 3.5 1.6 4 3.6" />
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
  gift: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="11" rx="1.5" />
      <path d="M12 10v11" />
      <path d="M3 14h18" />
      <path d="M12 10c-2.2 0-4-1.3-4-3s2.2-2.2 4-.6c1.8-1.6 4-.9 4 .6s-1.8 3-4 3Z" />
    </svg>
  ),
};

/** Board categories + 지역뉴스 inserted after 자유게시판 */
function buildMainNav() {
  const items = [];
  for (const cat of CATEGORIES) {
    items.push({
      key: cat.slug,
      nameKo: cat.nameKo,
      href: `/board/${cat.slug}`,
    });
    if (cat.slug === 'free') {
      items.push({
        key: 'news',
        nameKo: '지역뉴스',
        href: '/news',
      });
    }
  }
  return items;
}

const MAIN_NAV = buildMainNav();

function isNavActive(pathname, href) {
  if (!pathname || !href) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname() || '';

  useEffect(() => {
    async function loadProfile(userId) {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
      setIsAdmin(!!data?.is_admin);
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
      loadProfile(data.session?.user?.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
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
          <Link href="/" className="brand" aria-label="Tulip Town home">
            <span className="brand-main">
              <img src="/logo.png" alt="" className="brand-logo" />
              <span className="brand-name">TULIP TOWN KOREAN COMMUNITY</span>
            </span>
            <span className="brand-tagline">Serving Holland, Grand Rapids &amp; West Michigan</span>
          </Link>

          <div className="auth-area">
            {loaded && session ? (
              <>
                {isAdmin ? (
                  <Link href="/admin" className="admin-link">
                    관리자
                  </Link>
                ) : null}
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

        <nav className="main-nav" aria-label="주요 게시판">
          {MAIN_NAV.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {NAV_ICONS[item.key]}
                </span>
                <span>{item.nameKo}</span>
              </Link>
            );
          })}
          <Link
            href="/gift"
            className={`nav-item${isNavActive(pathname, '/gift') ? ' is-active' : ''}`}
            aria-current={isNavActive(pathname, '/gift') ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {NAV_ICONS.gift}
            </span>
            <span>튤립가게</span>
          </Link>
          <Link
            href="/directory"
            className={`nav-item${isNavActive(pathname, '/directory') ? ' is-active' : ''}`}
            aria-current={isNavActive(pathname, '/directory') ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {NAV_ICONS.directory}
            </span>
            <span>업체 디렉토리</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
