import React from 'react'

const PAGE_TITLES = {
  dashboard: 'Overview',
  customers: 'Customer Management',
  reports: 'Reports & Analytics',
}

export default function Topbar({ activePage, userEmail, onSignOut }) {
  return (
    <div style={s.topbar}>
      <div style={s.title}>ATHERIUM HOLDINGS</div>
      <div style={s.actions}>
        <div style={{ ...s.badge, ...s.badgeCosmo }}>
          <div style={{ ...s.dot, background: 'var(--cosmo)' }} />
          Cosmonova
        </div>
        <div style={{ ...s.badge, ...s.badgeEnt }}>
          <div style={{ ...s.dot, background: 'var(--enterprise)' }} />
          Cosmoenterprise
        </div>
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
