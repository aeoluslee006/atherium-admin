import React from 'react'

const NAV = [
  { section: 'Main', items: [
    { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    { id: 'customers', icon: 'ti-users', label: 'Customer Management' },
    { id: 'reports', icon: 'ti-chart-bar', label: 'Reports' },
  ]},
  { section: 'Platforms', items: [
    { id: null, icon: 'ti-building-store', label: 'Cosmonova' },
    { id: null, icon: 'ti-building-skyscraper', label: 'Cosmoenterprise' },
    {
      id: 'ttkc',
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

export default function Sidebar({ activePage, setActivePage, userEmail = 'Admin', onSignOut }) {
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

      <nav style={s.nav}>
        {NAV.map(group => (
          <div key={group.section} style={s.navSection}>
            <div style={s.navLabel}>{group.section}</div>
            {group.items.map(item => {
              const active = item.id && activePage === item.id
              return (
                <div
                  key={item.label}
                  style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
                  onClick={() => {
                    if (item.href) {
                      window.open(item.href, '_blank', 'noopener,noreferrer')
                      return
                    }
                    if (item.id) setActivePage(item.id)
                  }}
                  title={item.href ? 'Open in new tab' : undefined}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 16, width: 18 }} aria-hidden="true" />
                  {item.label}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={s.footer}>
        <div style={s.userChip}>
          <div style={s.avatar}>{(userEmail[0] || 'A').toUpperCase()}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Super Owner</div>
          </div>
        </div>
        {onSignOut && (
          <button type="button" onClick={onSignOut} style={s.signOutBtn}>
            <i className="ti ti-logout" style={{ fontSize: 16 }} aria-hidden="true" />
            Log out
          </button>
        )}
      </div>
    </aside>
  )
}

const s = {
  sidebar: {
    width: 220, background: 'var(--night2)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh',
    position: 'sticky', top: 0,
  },
  logoWrap: { padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' },
  logoMark: { display: 'flex', alignItems: 'center', gap: 10 },
  logoA: {
    width: 32, height: 32, flexShrink: 0,
    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
    clipPath: 'polygon(50% 0%,0% 100%,15% 100%,50% 20%,85% 100%,100% 100%)',
  },
  logoText: { fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 600, color: 'var(--gold)', letterSpacing: 2 },
  logoSub: { fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  nav: { flex: 1, padding: '16px 0', overflowY: 'auto' },
  navSection: { marginBottom: 4 },
  navLabel: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', padding: '8px 20px 4px', opacity: 0.6 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
    cursor: 'pointer', borderLeft: '2px solid transparent', fontSize: 13,
    color: 'var(--muted)', transition: 'all 0.2s',
  },
  navItemActive: { color: 'var(--gold)', borderLeftColor: 'var(--gold)', background: 'rgba(201,168,76,0.05)' },
  footer: { padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 },
  userChip: { display: 'flex', alignItems: 'center', gap: 8 },
  signOutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    border: '1px solid var(--border2)', background: 'rgba(201,168,76,0.1)', color: 'var(--gold-light)',
  },
  avatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 600, color: 'var(--night)', fontFamily: "'Cinzel', serif",
  },
}
