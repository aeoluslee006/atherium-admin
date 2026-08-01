import React, { useState } from 'react'

const TTKC_ADMIN_URL = 'https://tulip-town-app.vercel.app/admin'
const TTKC_SITE_URL = 'https://tulip-town-app.vercel.app'

export default function TtkcAdmin() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={s.wrap}>
      <div style={s.toolbar}>
        <div>
          <div style={s.title}>TTKC Admin</div>
          <div style={s.hint}>
            Atherium 안에서 Tulip Town 관리자 패널을 사용합니다. 처음에는 iframe 안에서 TTKC 관리자 계정으로 로그인해야 합니다.
          </div>
        </div>
        <div style={s.actions}>
          <a href={TTKC_ADMIN_URL} target="_blank" rel="noopener noreferrer" style={s.linkBtn}>
            <i className="ti ti-external-link" style={{ fontSize: 14 }} aria-hidden="true" />
            새 창에서 관리자
          </a>
          <a href={TTKC_SITE_URL} target="_blank" rel="noopener noreferrer" style={s.linkBtnGhost}>
            사이트 열기
          </a>
        </div>
      </div>

      <div style={s.frameShell}>
        {!loaded && <div style={s.loading}>관리자 패널 불러오는 중…</div>}
        <iframe
          title="TTKC Admin"
          src={TTKC_ADMIN_URL}
          style={s.iframe}
          onLoad={() => setLoaded(true)}
          allow="payment *; clipboard-read; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  )
}

const s = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    flex: 1,
    background: 'var(--night)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 20px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--night2)',
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: 15,
    color: 'var(--gold-light)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  hint: { fontSize: 12, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.45 },
  actions: { display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' },
  linkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 8,
    fontSize: 12,
    textDecoration: 'none',
    border: '1px solid rgba(217,79,140,0.45)',
    color: '#e87aaa',
    background: 'rgba(217,79,140,0.12)',
  },
  linkBtnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 8,
    fontSize: 12,
    textDecoration: 'none',
    border: '1px solid var(--border2)',
    color: 'var(--muted)',
    background: 'transparent',
  },
  frameShell: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    background: '#0b0d12',
  },
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--muted)',
    fontSize: 13,
    pointerEvents: 'none',
    zIndex: 1,
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 0,
    display: 'block',
    background: '#fff',
  },
}
