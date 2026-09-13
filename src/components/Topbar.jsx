import React from 'react'

const PAGE_TITLES = {
  dashboard: 'Overview',
  customers: 'Customer Management',
  reports: 'Reports & Analytics',
  community: 'Community Sites',
  ttkc: 'TTKC Admin',
}

export default function Topbar({ activePage, userEmail, onSignOut, stickersOpen, onToggleStickers }) {
  return (
    <div style={s.topbar}>
      <div style={s.title}>ATHERIUM HOLDINGS{PAGE_TITLES[activePage] ? ` · ${PAGE_TITLES[activePage]}` : ''}</div>
      <div style={s.actions}>
        {onToggleStickers && (
          <button
            type="button"
            onClick={onToggleStickers}
            style={{
              ...s.iconBtn, width: 'auto', padding: '0 10px', gap: 6, fontSize: 11,
              background: stickersOpen ? 'rgba(123,92,240,0.15)' : 'var(--night3)',
              borderColor: stickersOpen ? 'rgba(123,92,240,0.4)' : 'var(--border)',
              color: stickersOpen ? '#c4b5fd' : 'var(--muted)',
            }}
            title="Toggle stickers panel"
          >
            📌 Stickers
          </button>
        )}
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
