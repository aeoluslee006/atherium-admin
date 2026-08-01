import React from 'react'

const PAGE_TITLES = {
  dashboard: 'Overview',
  customers: 'Customer Management',
  reports: 'Reports & Analytics',
  ttkc: 'TTKC Admin',
}

export default function Topbar({ activePage, userEmail, onSignOut, onNavigate }) {
  return (
    <div style={s.topbar}>
      <div style={s.title}>ATHERIUM HOLDINGS{PAGE_TITLES[activePage] ? ` · ${PAGE_TITLES[activePage]}` : ''}</div>
      <div style={s.actions}>
        <div style={{ ...s.badge, ...s.badgeCosmo }}>
          <div style={{ ...s.dot, background: 'var(--cosmo)' }} />
          Cosmonova
        </div>
        <div style={{ ...s.badge, ...s.badgeEnt }}>
          <div style={{ ...s.dot, background: 'var(--enterprise)' }} />
          Cosmoenterprise
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('ttkc')}
          style={{ ...s.badge, ...s.badgeTtkc, ...(activePage === 'ttkc' ? s.badgeTtkcActive : {}) }}
          title="TTKC Admin in Atherium"
        >
          <div style={{ ...s.dot, background: 'var(--tulip, #d94f8c)' }} />
          TTKC
        </button>
        <button style={s.iconBtn} aria-label="Notifications">
          <i className="ti ti-bell" style={{ fontSize: 16 }} aria-hidden="true" />
        </button>
        <button style={s.iconBtn} aria-label="Search">
          <i className="ti ti-search" style={{ fontSize: 16 }} aria-hidden="true" />
        </button>
        {onSignOut && (
          <button type="button" onClick={onSignOut} style={s.signOutBtn} title={userEmail || undefined}>
            <i className="ti ti-logout" style={{ fontSize: 16 }} aria-hidden="true" />
            Log out
          </button>
        )}
      </div>
    </div>
  )
}

const s = {
  topbar: {
    height: 56, background: 'var(--night2)', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0,
  },
  title: { fontFamily: "'Cinzel', serif", fontSize: 14, color: 'var(--gold-light)', letterSpacing: 1, flex: 1 },
  actions: { display: 'flex', alignItems: 'center', gap: 8 },
  badge: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
    borderRadius: 20, fontSize: 11, border: '1px solid', cursor: 'default',
  },
  badgeCosmo: { borderColor: 'rgba(79,143,232,0.4)', color: 'var(--cosmo)', background: 'rgba(79,143,232,0.08)' },
  badgeEnt: { borderColor: 'rgba(123,92,240,0.4)', color: 'var(--enterprise)', background: 'rgba(123,92,240,0.08)' },
  badgeTtkc: {
    borderColor: 'rgba(217,79,140,0.45)',
    color: '#e87aaa',
    background: 'rgba(217,79,140,0.1)',
    cursor: 'pointer',
    font: 'inherit',
  },
  badgeTtkcActive: {
    borderColor: 'rgba(217,79,140,0.8)',
    background: 'rgba(217,79,140,0.22)',
  },
  dot: { width: 6, height: 6, borderRadius: '50%' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8, background: 'var(--night3)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: 'var(--muted)',
  },
  signOutBtn: {
    display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4,
    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    border: '1px solid var(--border2)', background: 'rgba(201,168,76,0.12)',
    color: 'var(--gold-light)',
  },
}
