import React from 'react'

const SITES = [
  {
    id: 'ttkc',
    name: 'Tulip Town Korean Community',
    shortName: 'TTKC',
    region: 'Holland, Grand Rapids & West Michigan',
    url: 'https://www.ttkc.us',
    // Opens Atherium’s native TTKC admin page (not the public site /admin login).
    adminPage: 'ttkc',
    status: 'Live',
  },
]

export default function CommunitySites({ onOpenAdmin }) {
  return (
    <div>
      <div style={s.header}>
        <div style={s.title}>Community Sites</div>
        <div style={s.sub}>Atherium Holdings가 운영하는 지역 커뮤니티 사이트 목록</div>
      </div>

      <div style={s.grid}>
        {SITES.map((site) => (
          <div key={site.id} style={s.card}>
            <div style={s.cardTop}>
              <div style={s.cardName}>{site.name}</div>
              <span style={s.badge}>{site.status}</span>
            </div>
            <div style={s.cardShort}>{site.shortName}</div>
            <div style={s.cardRegion}>{site.region}</div>
            <div style={s.cardUrl}>{site.url.replace(/^https:\/\//, '')}</div>
            <div style={s.btnRow}>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                style={s.openBtn}
              >
                <i className="ti ti-external-link" style={{ fontSize: 14 }} aria-hidden="true" />
                사이트 열기
              </a>
              {site.adminPage ? (
                <button
                  type="button"
                  onClick={() => onOpenAdmin?.(site.adminPage)}
                  style={s.adminBtn}
                >
                  <i className="ti ti-shield-lock" style={{ fontSize: 14 }} aria-hidden="true" />
                  관리자 페이지
                </button>
              ) : null}
            </div>
          </div>
        ))}

        <div style={s.addCard}>
          <i className="ti ti-plus" style={{ fontSize: 20, color: 'var(--muted)' }} aria-hidden="true" />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>
            새 지역 커뮤니티 사이트는
            <br />
            여기에 추가됩니다
          </div>
        </div>
      </div>

      <div style={s.note}>
        「관리자 페이지」는 Atherium 안에 통합된 TTKC 관리 화면으로 이동합니다.
        커뮤니티 사이트 자체 로그인(/login)이 아닌, Holdings 세션으로 회원·모더레이션을 다룹니다.
      </div>
    </div>
  )
}

const s = {
  header: { marginBottom: 20 },
  title: { fontFamily: "'Cinzel', serif", fontSize: 16, color: 'var(--bright)', letterSpacing: 0.5 },
  sub: { fontSize: 12, color: 'var(--muted)', marginTop: 3 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
    marginBottom: 20,
  },
  card: {
    background: 'var(--night3)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardName: { fontSize: 14, fontWeight: 500, color: 'var(--bright)' },
  badge: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 12,
    flexShrink: 0,
    background: 'rgba(46,192,138,0.15)',
    color: 'var(--success)',
    border: '1px solid rgba(46,192,138,0.3)',
  },
  cardShort: { fontSize: 11, color: 'var(--gold)', letterSpacing: 1, fontWeight: 600 },
  cardRegion: { fontSize: 12, color: 'var(--muted)' },
  cardUrl: { fontSize: 11, color: 'var(--cosmo)', marginBottom: 8 },
  btnRow: { display: 'flex', gap: 8, marginTop: 'auto' },
  openBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid var(--border2)',
    background: 'rgba(201,168,76,0.1)',
    color: 'var(--gold-light)',
    fontSize: 12,
    fontWeight: 500,
    textDecoration: 'none',
  },
  adminBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid rgba(79,143,232,0.4)',
    background: 'rgba(79,143,232,0.1)',
    color: 'var(--cosmo)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    font: 'inherit',
  },
  addCard: {
    border: '1px dashed var(--border2)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 150,
  },
  note: { fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 },
}
