import React, { useCallback, useEffect, useState } from 'react'
import { fetchTtkcMembers, fetchTtkcOverview, moderateTtkcMember } from '../lib/ttkcAdminApi'

const TTKC_SITE = 'https://tulip-town-app.vercel.app'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function memberStatus(row) {
  if (row.is_banned) return { label: '계정 해지', tone: 'danger' }
  if (row.suspended_until && new Date(row.suspended_until).getTime() > Date.now()) {
    return { label: '일시 정지', tone: 'warn' }
  }
  if (row.is_admin) return { label: '관리자', tone: 'gold' }
  return { label: '정상', tone: 'ok' }
}

export default function TtkcAdmin() {
  const [stats, setStats] = useState(null)
  const [members, setMembers] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async (query = '') => {
    setLoading(true)
    setError('')
    try {
      const [overview, list] = await Promise.all([
        fetchTtkcOverview(),
        fetchTtkcMembers(query),
      ])
      setStats(overview.stats || null)
      setMembers(list.members || [])
      setHint(overview.setupHint || list.setupHint || '')
    } catch (err) {
      setError(err.message || '불러오기 실패')
      setStats(null)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load('')
  }, [load])

  async function runModeration(row, action) {
    let reason = ''
    let days = null

    if (action === 'ban') {
      reason = window.prompt(
        '계정 해지 사유 (불법 게시물 등)',
        row.banned_reason || '불법/유해 게시물'
      )
      if (reason === null) return
    } else if (action === 'suspend') {
      const daysRaw = window.prompt('일시 정지 일수', '7')
      if (daysRaw === null) return
      days = Number(daysRaw)
      if (!Number.isFinite(days) || days <= 0) {
        setError('올바른 정지 일수를 입력하세요.')
        return
      }
      reason = window.prompt('정지 사유', row.banned_reason || '규정 위반') || ''
    } else if (action === 'clear') {
      if (!window.confirm(`${row.display_name || row.email || '이 회원'} 제재를 해제할까요?`)) return
    }

    setBusyId(row.id)
    setError('')
    try {
      await moderateTtkcMember(row.id, { action, reason, days })
      await load(q)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  const cards = [
    { label: '총 방문자', value: stats?.totalVisitors, icon: 'ti-eye', sub: `고유 ${stats?.uniqueVisitors ?? 0}` },
    { label: '회원 수', value: stats?.memberCount, icon: 'ti-users', sub: `활성 ${stats?.activeMembers ?? 0}` },
    { label: '정지 / 해지', value: (stats?.suspendedMembers ?? 0) + (stats?.bannedMembers ?? 0), icon: 'ti-ban', sub: `정지 ${stats?.suspendedMembers ?? 0} · 해지 ${stats?.bannedMembers ?? 0}` },
    { label: '포인트(잔여/구매)', value: stats?.pointsBalanceTotal, icon: 'ti-coin', sub: `구매 합계 ${stats?.pointsPurchasedTotal ?? 0}` },
  ]

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Tulip Town · TTKC</div>
          <div style={s.sub}>방문자·회원 리포트와 회원 관리 (정지 / 계정 해지)</div>
        </div>
        <a href={TTKC_SITE} target="_blank" rel="noopener noreferrer" style={s.siteLink}>
          <i className="ti ti-external-link" style={{ fontSize: 14 }} aria-hidden="true" />
          사이트 열기
        </a>
      </div>

      <div style={s.cards}>
        {cards.map((card) => (
          <div key={card.label} style={s.card}>
            <div style={s.cardTop}>
              <div style={s.cardLabel}>{card.label}</div>
              <i className={`ti ${card.icon}`} style={{ color: 'var(--gold)', fontSize: 16 }} aria-hidden="true" />
            </div>
            <div style={s.cardValue}>{loading && stats == null ? '…' : String(card.value ?? 0)}</div>
            <div style={s.cardSub}>{card.sub}</div>
          </div>
        ))}
      </div>

      {hint ? <div style={s.hintBanner}>{hint}</div> : null}
      {error ? <div style={s.errorBanner}>{error}</div> : null}

      <div style={s.panel}>
        <div style={s.panelHead}>
          <div>
            <div style={s.panelTitle}>회원 리스트</div>
            <div style={s.panelSub}>가입일 · 이름 · 전화 · 이메일 · 포인트 · 제재</div>
          </div>
          <form
            style={s.searchRow}
            onSubmit={(e) => {
              e.preventDefault()
              load(q)
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름 / 이메일 / 전화 검색"
              style={s.searchInput}
            />
            <button type="submit" style={s.searchBtn}>검색</button>
            <button type="button" style={s.refreshBtn} onClick={() => load(q)}>새로고침</button>
          </form>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>가입 날짜</th>
                <th style={s.th}>이름</th>
                <th style={s.th}>전화 번호</th>
                <th style={s.th}>이메일</th>
                <th style={s.th}>구매 포인트</th>
                <th style={s.th}>잔여 포인트</th>
                <th style={s.th}>상태</th>
                <th style={{ ...s.th, textAlign: 'right' }}>권한</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={s.empty}>불러오는 중…</td>
                </tr>
              )}
              {!loading && members.length === 0 && (
                <tr>
                  <td colSpan={8} style={s.empty}>회원이 없습니다.</td>
                </tr>
              )}
              {!loading && members.map((row) => {
                const status = memberStatus(row)
                const busy = busyId === row.id
                return (
                  <tr key={row.id}>
                    <td style={s.td}>{formatDate(row.created_at)}</td>
                    <td style={s.td}>{row.display_name || '—'}</td>
                    <td style={s.td}>{row.phone || '—'}</td>
                    <td style={s.td}>{row.email || '—'}</td>
                    <td style={s.td}>{Number(row.points_purchased || 0).toLocaleString()}</td>
                    <td style={s.td}>{Number(row.points_balance || 0).toLocaleString()}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...s[`badge_${status.tone}`] }}>{status.label}</span>
                      {row.banned_reason ? (
                        <div style={s.reason}>{row.banned_reason}</div>
                      ) : null}
                      {status.tone === 'warn' && row.suspended_until ? (
                        <div style={s.reason}>~ {formatDate(row.suspended_until)}</div>
                      ) : null}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      {row.is_admin ? (
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>보호됨</span>
                      ) : (
                        <div style={s.actions}>
                          <button
                            type="button"
                            disabled={busy}
                            style={s.btnWarn}
                            onClick={() => runModeration(row, 'suspend')}
                          >
                            정지
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            style={s.btnDanger}
                            onClick={() => runModeration(row, 'ban')}
                          >
                            해지
                          </button>
                          {(row.is_banned || row.suspended_until) && (
                            <button
                              type="button"
                              disabled={busy}
                              style={s.btnGhost}
                              onClick={() => runModeration(row, 'clear')}
                            >
                              해제
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const s = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: 20,
    color: 'var(--gold-light)',
    letterSpacing: 1,
  },
  sub: { marginTop: 6, fontSize: 12, color: 'var(--muted)' },
  siteLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(217,79,140,0.45)',
    color: '#e87aaa',
    textDecoration: 'none',
    fontSize: 12,
    background: 'rgba(217,79,140,0.1)',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    background: 'var(--night2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '14px 16px',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 11, color: 'var(--muted)', letterSpacing: 0.3 },
  cardValue: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: 600,
    color: 'var(--bright)',
    fontVariantNumeric: 'tabular-nums',
  },
  cardSub: { marginTop: 6, fontSize: 11, color: 'var(--muted)' },
  hintBanner: {
    marginBottom: 12,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(232,148,58,0.35)',
    background: 'rgba(232,148,58,0.08)',
    color: '#f0b57a',
    fontSize: 12,
    lineHeight: 1.45,
  },
  errorBanner: {
    marginBottom: 12,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(232,79,79,0.4)',
    background: 'rgba(232,79,79,0.1)',
    color: '#ff8f8f',
    fontSize: 12,
  },
  panel: {
    background: 'var(--night2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 16,
  },
  panelHead: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  panelTitle: { fontSize: 14, color: 'var(--bright)', fontWeight: 600 },
  panelSub: { marginTop: 4, fontSize: 11, color: 'var(--muted)' },
  searchRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  searchInput: {
    minWidth: 220,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border2)',
    background: 'var(--night3)',
    color: 'var(--text)',
    fontSize: 12,
  },
  searchBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border2)',
    background: 'rgba(201,168,76,0.15)',
    color: 'var(--gold-light)',
    fontSize: 12,
  },
  refreshBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 12,
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 980 },
  th: {
    textAlign: 'left',
    fontSize: 11,
    color: 'var(--muted)',
    fontWeight: 500,
    padding: '10px 8px',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 8px',
    borderBottom: '1px solid rgba(201,168,76,0.08)',
    fontSize: 12,
    color: 'var(--text)',
    verticalAlign: 'top',
  },
  empty: {
    padding: 28,
    textAlign: 'center',
    color: 'var(--muted)',
    fontSize: 13,
  },
  badge: {
    display: 'inline-flex',
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 11,
    border: '1px solid',
  },
  badge_ok: { color: 'var(--success)', borderColor: 'rgba(46,192,138,0.4)', background: 'rgba(46,192,138,0.1)' },
  badge_warn: { color: 'var(--warn)', borderColor: 'rgba(232,148,58,0.45)', background: 'rgba(232,148,58,0.1)' },
  badge_danger: { color: 'var(--danger)', borderColor: 'rgba(232,79,79,0.45)', background: 'rgba(232,79,79,0.1)' },
  badge_gold: { color: 'var(--gold-light)', borderColor: 'var(--border2)', background: 'rgba(201,168,76,0.12)' },
  reason: { marginTop: 4, fontSize: 10, color: 'var(--muted)', maxWidth: 160 },
  actions: { display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' },
  btnWarn: {
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid rgba(232,148,58,0.45)',
    background: 'rgba(232,148,58,0.12)',
    color: '#f0b57a',
    fontSize: 11,
  },
  btnDanger: {
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid rgba(232,79,79,0.45)',
    background: 'rgba(232,79,79,0.12)',
    color: '#ff8f8f',
    fontSize: 11,
  },
  btnGhost: {
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 11,
  },
}
