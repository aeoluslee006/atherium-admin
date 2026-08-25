import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AtheriumBottomNav from './AtheriumBottomNav'
import { SIDEBAR_WIDTH, SIDEBAR_BOTTOM_OFFSET } from '../constants/layout'

const NAV = [
  { section: 'Main', items: [
    { id: 'dashboard', path: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'customers', path: '/customers', icon: 'ti-users', label: 'Customer Management' },
    { id: 'reports', path: '/reports', icon: 'ti-chart-bar', label: 'Reports' },
  ]},
  { section: 'Community', items: [
    { id: 'community', path: '/community', icon: 'ti-building-community', label: 'Community Sites' },
  ]},
  { section: 'Platforms', items: [
    { id: null, icon: 'ti-building-store', label: 'Cosmonova' },
    { id: null, icon: 'ti-building-skyscraper', label: 'Cosmoenterprise' },
    {
      id: 'ttkc',
      path: '/ttkc',
      icon: 'ti-flower',
      label: 'TTKC / Tulip Town',
    },
  ]},
  { section: 'System', items: [
    { id: null, icon: 'ti-credit-card', label: 'Billing' },
    { id: null, icon: 'ti-shield-check', label: 'Security' },
    { id: null, icon: 'ti-plug', label: 'Integrations' },
    { id: null, icon: 'ti-settings', label: 'Settings' },
  ]},
]

export default function Sidebar({ activePage, userEmail = 'Admin' }) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside style={s.sidebar}>
      <div style={s.logoWrap}>
        <div style={s.logoMark}>
          <div style={s.logoA} />
          <div>
            <div style={s.logoText}>ATHERIUM</div>
            <div style={s.logoSub}>Holdings, LLC</div>
          </div>
        </div>
      </div>

      <div style={s.scroll}>
        <nav style={s.nav}>
          {NAV.map(group => (
            <div key={group.section} style={s.navSection}>
              <div style={s.navLabel}>{group.section}</div>
              {group.items.map(item => {
                const active = item.path
                  ? location.pathname === item.path
                  : item.id && activePage === item.id
                return (
                  <div
                    key={item.label}
                    style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
                    onClick={() => {
                      if (item.href) {
                        window.open(item.href, '_blank', 'noopener,noreferrer')
                        return
                      }
                      if (item.path) navigate(item.path)
                    }}
                    title={item.href ? 'Open in new tab' : undefined}
                  >
                    {item.emoji ? (
                      <span style={{ fontSize: 14, width: 16, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
                    ) : (
                      <i className={`ti ${item.icon}`} style={{ fontSize: 14, width: 16, flexShrink: 0 }} aria-hidden="true" />
                    )}
                    {item.label}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={s.bottomBlock}>
          <AtheriumBottomNav compact />
          <div style={s.userChip}>
            <div style={s.avatar}>{(userEmail[0] || 'A').toUpperCase()}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Super Owner</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

const s = {
  sidebar: {
    width: SIDEBAR_WIDTH, background: 'var(--night2)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh',
    position: 'sticky', top: 0,
  },
  logoWrap: { padding: '18px 14px 14px', borderBottom: '1px solid var(--border)' },
  logoMark: { display: 'flex', alignItems: 'center', gap: 8 },
  logoA: {
    width: 28, height: 28, flexShrink: 0,
    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
    clipPath: 'polygon(50% 0%,0% 100%,15% 100%,50% 20%,85% 100%,100% 100%)',
  },
  logoText: { fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600, color: 'var(--gold)', letterSpacing: 1.5 },
  logoSub: { fontSize: 8, color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
  scroll: { flex: 1, overflowY: 'auto', minHeight: 0 },
  nav: { padding: '12px 0 0' },
  navSection: { marginBottom: 2 },
  navLabel: { fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--muted)', padding: '6px 14px 3px', opacity: 0.6 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
    cursor: 'pointer', borderLeft: '2px solid transparent', fontSize: 12,
    color: 'var(--muted)', transition: 'all 0.2s', lineHeight: 1.25,
  },
  navItemActive: { color: 'var(--gold)', borderLeftColor: 'var(--gold)', background: 'rgba(201,168,76,0.05)' },
  bottomBlock: {
    padding: '10px 14px 14px', marginTop: SIDEBAR_BOTTOM_OFFSET,
    borderTop: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  userChip: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, color: 'var(--night)',
  },
}