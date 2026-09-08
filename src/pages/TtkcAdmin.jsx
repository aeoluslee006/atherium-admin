import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchTtkcMembers,
  fetchTtkcMemberMessages,
  fetchTtkcOverview,
  fetchTtkcPricing,
  markTtkcMemberMessagesRead,
  moderateTtkcMember,
  saveTtkcPricing,
  setTtkcMemberPromo,
} from '../lib/ttkcAdminApi'
import {
  centsToDollarInput,
  displayLabelForPricingRow,
  dollarsToCents,
  groupPricingSettings,
} from '../lib/pricingAdminUi'

const TTKC_SITE = 'https://www.ttkc.us'
const SQL_EDITOR = 'https://supabase.com/dashboard/project/lyikgkjhkmppvciicxfm/sql/new'
const SQL_FILE = '/atherium_admin_ttkc_fix.sql'

const PROMO_PRODUCTS = [
  { key: 'tulip_shop', label: '튤립몰', defaultDays: 30 },
  { key: 'directory_listing', label: '업체 디렉토리', defaultDays: 20 },
]

const TIER_LABELS = {
  super_admin: '관리자',
  black: '블랙',
  diamond: '다이아몬드',
  gold: '골드',
  silver: '실버',
  bronze: '브론즈',
}

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

function memberAccountStatus(row) {
  const status = row.status || (row.is_banned ? 'deleted' : row.suspended_until && new Date(row.suspended_until) > Date.now() ? 'hold' : 'active')
  if (status === 'deleted' || row.is_banned) return { label: '해지', tone: 'danger', status: 'deleted' }
  if (status === 'hold') return { label: '홀드', tone: 'warn', status: 'hold' }
  if (row.is_admin) return { label: '관리자', tone: 'gold', status: 'active' }
  return { label: '정상', tone: 'ok', status: 'active' }
}

export default function TtkcAdmin() {
  const [stats, setStats] = useState(null)
  const [members, setMembers] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [schemaReady, setSchemaReady] = useState(null)
  const [busyId, setBusyId] = useState('')
  const [sqlText, setSqlText] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedId, setExpandedId] = useState('')
  const [promoDraft, setPromoDraft] = useState({})
  const [msgOpenId, setMsgOpenId] = useState('')
  const [messages, setMessages] = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [pricingRows, setPricingRows] = useState([])
  const [dollarDraft, setDollarDraft] = useState({})
  const [pricingBusy, setPricingBusy] = useState('')
  const [pricingMsg, setPricingMsg] = useState('')
  const [pricingOpen, setPricingOpen] = useState({
    directory: true,
    tulip: true,
    legacy_seller: false,
    other: false,
  })

  const load = useCallback(async (query = '') => {
    setLoading(true)
    setError('')
    try {
      const [overview, list] = await Promise.all([
        fetchTtkcOverview(),
        fetchTtkcMembers(query),
      ])
      setStats(overview.stats || null)
      const rows = list.members || []
      setMembers(rows)
      const drafts = {}
      for (const m of rows) {
        drafts[m.id] = {}
        for (const p of PROMO_PRODUCTS) {
          const found = (m.promotions || []).find((x) => x.product_key === p.key)
          drafts[m.id][p.key] = found?.promo_end_date || ''
        }
      }
      setPromoDraft(drafts)
      setHint(overview.setupHint || list.setupHint || '')
      setSchemaReady(overview.schemaReady !== false && list.schemaReady !== false)
    } catch (err) {
      setError(err.message || '불러오기 실패')
      setStats(null)
      setMembers([])
      setSchemaReady(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch(SQL_FILE)
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => setSqlText(text || ''))
      .catch(() => setSqlText(''))
  }, [])

  useEffect(() => {
    load('')
  }, [load])

  async function copySql() {
    if (!sqlText) return
    try {
      await navigator.clipboard.writeText(sqlText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('클립보드 복사에 실패했습니다. SQL 파일을 직접 열어 복사하세요.')
    }
  }

  async function runModeration(row, action) {
    let reason = ''
    if (action === 'ban' || action === 'delete') {
      reason = window.prompt('해지(soft delete) 사유', row.banned_reason || '규정 위반')
      if (reason === null) return
      if (!window.confirm('해지할까요? 유료 게시물 비노출 · Stripe 구독 취소(앱 측 처리)')) return
    } else if (action === 'suspend' || action === 'hold') {
      reason = window.prompt('홀드 사유', row.banned_reason || '검토 중') || ''
      if (!window.confirm('홀드할까요? 작성/유료신청 차단 · 유료 비노출 · Stripe pause')) return
    } else if (action === 'clear' || action === 'unhold') {
      if (!window.confirm(`${row.display_name || row.email || '이 회원'} 홀드/해지를 해제할까요?`)) return
    }

    setBusyId(row.id)
    setError('')
    try {
      await moderateTtkcMember(row.id, { action, reason })
      await load(q)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function savePromos(row) {
    setBusyId(row.id)
    setError('')
    try {
      const draft = promoDraft[row.id] || {}
      for (const p of PROMO_PRODUCTS) {
        await setTtkcMemberPromo(row.id, p.key, draft[p.key] || null)
      }
      await load(q)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function openMessages(id) {
    setMsgOpenId(id)
    setMsgLoading(true)
    setMessages([])
    try {
      const data = await fetchTtkcMemberMessages(id)
      setMessages(data.messages || [])
      await markTtkcMemberMessagesRead(id)
      await load(q)
    } catch (err) {
      setError(err.message)
    } finally {
      setMsgLoading(false)
    }
  }

  async function openPricing() {
    setShowPricing(true)
    setPricingMsg('')
    setError('')
    try {
      const data = await fetchTtkcPricing()
      const settings = (data.settings || []).map((r) => ({ ...r }))
      setPricingRows(settings)
      const dollars = {}
      for (const r of settings) dollars[r.key] = centsToDollarInput(r.amount_cents)
      setDollarDraft(dollars)
    } catch (err) {
      setError(err.message)
    }
  }

  async function savePrice(row) {
    setPricingBusy(row.key)
    setPricingMsg('')
    try {
      const cents = dollarsToCents(dollarDraft[row.key])
      if (cents == null) throw new Error('금액($)을 올바르게 입력해 주세요.')
      await saveTtkcPricing({
        key: row.key,
        amount_cents: cents,
        label: row.label,
        is_active: !!row.is_active,
      })
      setPricingMsg(`${displayLabelForPricingRow(row)} 저장됨 ($${centsToDollarInput(cents)})`)
      const data = await fetchTtkcPricing()
      const settings = (data.settings || []).map((r) => ({ ...r }))
      setPricingRows(settings)
      const dollars = {}
      for (const r of settings) dollars[r.key] = centsToDollarInput(r.amount_cents)
      setDollarDraft(dollars)
    } catch (err) {
      setError(err.message)
    } finally {
      setPricingBusy('')
    }
  }

  const pricingGroups = useMemo(
    () => groupPricingSettings(pricingRows, { showInactiveLegacy: false }),
    [pricingRows]
  )

  const cards = useMemo(
    () => [
      { label: '총 방문자', value: stats?.totalVisitors, icon: 'ti-eye', sub: `고유 ${stats?.uniqueVisitors ?? 0}` },
      { label: '회원 수', value: stats?.memberCount, icon: 'ti-users', sub: `활성 ${stats?.activeMembers ?? 0}` },
      {
        label: '홀드 / 해지',
        value: (stats?.suspendedMembers ?? 0) + (stats?.bannedMembers ?? 0),
        icon: 'ti-ban',
        sub: `홀드 ${stats?.suspendedMembers ?? 0} · 해지 ${stats?.bannedMembers ?? 0}`,
      },
      {
        label: '안 읽은 문의',
        value: stats?.unreadMessages ?? 0,
        icon: 'ti-mail',
        sub: '관리자 메시지함',
      },
    ],
    [stats]
  )

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Tulip Town · TTKC</div>
          <div style={s.sub}>ATHERIUM 관리 · 회원 · 단가 · 문의 메시지</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={s.pricingBtn} onClick={openPricing}>
            <i className="ti ti-currency-dollar" style={{ fontSize: 14 }} aria-hidden="true" />
            단가 관리
          </button>
          <a href={TTKC_SITE} target="_blank" rel="noopener noreferrer" style={s.siteLink}>
            <i className="ti ti-external-link" style={{ fontSize: 14 }} aria-hidden="true" />
            사이트 열기
          </a>
        </div>
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

      {showPricing ? (
        <div style={s.panel}>
          <div style={s.panelHead}>
            <div>
              <div style={s.panelTitle}>단가 관리</div>
            </div>
            <button type="button" style={s.refreshBtn} onClick={() => setShowPricing(false)}>
              닫기
            </button>
          </div>
          {pricingMsg ? <div style={s.okBanner}>{pricingMsg}</div> : null}
          <div style={{ display: 'grid', gap: 12 }}>
            {pricingGroups.map((group) => {
              const open = pricingOpen[group.id] !== false
              return (
                <div key={group.id} style={s.priceCard}>
                  <button
                    type="button"
                    style={{
                      ...s.refreshBtn,
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: open ? 10 : 0,
                    }}
                    onClick={() =>
                      setPricingOpen((prev) => ({ ...prev, [group.id]: !open }))
                    }
                  >
                    <strong style={{ color: 'var(--bright)' }}>{group.title}</strong>
                    <span>
                      {open ? '접기' : '펼치기'} · {group.items.length}
                    </span>
                  </button>
                  {open ? (
                    <div style={s.priceGrid}>
                      {group.items.map((row) => (
                        <div key={row.key} style={s.priceItem}>
                          <div style={{ fontWeight: 600, marginBottom: 8 }}>
                            {displayLabelForPricingRow(row)}
                          </div>
                          <label style={s.fieldLabel}>표시 라벨</label>
                          <input
                            style={s.searchInput}
                            value={row.label || ''}
                            onChange={(e) =>
                              setPricingRows((prev) =>
                                prev.map((r) =>
                                  r.key === row.key ? { ...r, label: e.target.value } : r
                                )
                              )
                            }
                          />
                          <label style={s.fieldLabel}>금액 ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={s.searchInput}
                            value={dollarDraft[row.key] ?? ''}
                            onChange={(e) =>
                              setDollarDraft((prev) => ({
                                ...prev,
                                [row.key]: e.target.value,
                              }))
                            }
                          />
                          <label
                            style={{
                              ...s.fieldLabel,
                              display: 'flex',
                              gap: 8,
                              alignItems: 'center',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!row.is_active}
                              onChange={(e) =>
                                setPricingRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key
                                      ? { ...r, is_active: e.target.checked }
                                      : r
                                  )
                                )
                              }
                            />
                            활성화
                          </label>
                          <button
                            type="button"
                            style={s.searchBtn}
                            disabled={pricingBusy === row.key}
                            onClick={() => savePrice(row)}
                          >
                            {pricingBusy === row.key ? '저장 중…' : '저장'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
            {!pricingRows.length ? (
              <div style={s.empty}>요금 항목이 없습니다. SQL을 실행해 주세요.</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {schemaReady === false && (
        <div style={s.setupBox}>
          <div style={s.setupTitle}>데이터베이스 설정(SQL)이 필요합니다</div>
          <div style={s.setupBody}>
            등급·서비스별 프로모션·문의 메시지·단가 브리지를 쓰려면 아래 SQL을 한 번 실행하세요.
          </div>
          <ol style={s.setupList}>
            <li>
              <b>SQL 복사</b> 후{' '}
              <a href={SQL_EDITOR} target="_blank" rel="noopener noreferrer" style={s.setupLink}>
                Supabase SQL Editor
              </a>
              에서 Run
            </li>
            <li>이 페이지에서 <b>새로고침</b></li>
          </ol>
          <div style={s.setupActions}>
            <button type="button" style={s.setupBtn} onClick={copySql} disabled={!sqlText}>
              {copied ? '복사됨 ✓' : 'SQL 복사'}
            </button>
            <a href={SQL_FILE} target="_blank" rel="noopener noreferrer" style={s.setupBtnGhost}>
              SQL 파일 열기
            </a>
          </div>
          {hint ? <div style={{ marginTop: 10, fontSize: 11, opacity: 0.85 }}>{hint}</div> : null}
        </div>
      )}
      {error ? <div style={s.errorBanner}>{error}</div> : null}

      <div style={s.panel}>
        <div style={s.panelHead}>
          <div>
            <div style={s.panelTitle}>회원 리스트</div>
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
              placeholder="검색"
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
                <th style={s.th}>전화</th>
                <th style={s.th}>이메일</th>
                <th style={s.th}>등급</th>
                <th style={s.th}>프로모션</th>
                <th style={s.th}>메시지</th>
                <th style={s.th}>상태</th>
                <th style={{ ...s.th, textAlign: 'right' }}>권한</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={s.empty}>불러오는 중…</td>
                </tr>
              )}
              {!loading && members.length === 0 && (
                <tr>
                  <td colSpan={9} style={s.empty}>회원이 없습니다.</td>
                </tr>
              )}
              {!loading &&
                members.map((row) => {
                  const status = memberAccountStatus(row)
                  const busy = busyId === row.id
                  const tier = row.tier || 'bronze'
                  const expanded = expandedId === row.id
                  return (
                    <React.Fragment key={row.id}>
                      <tr>
                        <td style={s.td}>{formatDate(row.created_at)}</td>
                        <td style={s.td}>{row.display_name || '—'}</td>
                        <td style={s.td}>{row.phone || '—'}</td>
                        <td style={s.td}>{row.email || '—'}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, ...s.badge_gold }}>{TIER_LABELS[tier] || tier}</span>
                        </td>
                        <td style={s.td}>
                          <button
                            type="button"
                            style={s.btnGhost}
                            onClick={() => setExpandedId(expanded ? '' : row.id)}
                          >
                            {expanded ? '닫기' : '설정'}
                          </button>
                        </td>
                        <td style={s.td}>
                          <button type="button" style={s.btnGhost} onClick={() => openMessages(row.id)}>
                            {row.unread_messages > 0 ? `안 읽음 ${row.unread_messages}` : '보기'}
                          </button>
                        </td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, ...s[`badge_${status.tone}`] }}>{status.label}</span>
                          {row.banned_reason ? <div style={s.reason}>{row.banned_reason}</div> : null}
                        </td>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          {row.is_admin ? (
                            <span style={{ color: 'var(--muted)', fontSize: 11 }}>보호됨</span>
                          ) : (
                            <div style={s.actions}>
                              {status.status !== 'hold' ? (
                                <button
                                  type="button"
                                  disabled={busy || status.status === 'deleted'}
                                  style={s.btnWarn}
                                  onClick={() => runModeration(row, 'hold')}
                                >
                                  홀드
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy}
                                  style={s.btnGhost}
                                  onClick={() => runModeration(row, 'unhold')}
                                >
                                  해제
                                </button>
                              )}
                              {status.status !== 'deleted' ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  style={s.btnDanger}
                                  onClick={() => runModeration(row, 'ban')}
                                >
                                  해지
                                </button>
                              ) : null}
                            </div>
                          )}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td colSpan={9} style={{ ...s.td, background: 'rgba(0,0,0,0.18)' }}>
                            <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>프로모션 종료일</div>
                              {PROMO_PRODUCTS.map((p) => (
                                <div key={p.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{ minWidth: 110, fontSize: 12 }}>{p.label}</span>
                                  <input
                                    type="date"
                                    style={s.searchInput}
                                    value={(promoDraft[row.id] && promoDraft[row.id][p.key]) || ''}
                                    disabled={busy || row.is_admin}
                                    onChange={(e) =>
                                      setPromoDraft((prev) => ({
                                        ...prev,
                                        [row.id]: {
                                          ...(prev[row.id] || {}),
                                          [p.key]: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <span style={s.reason}>기본 {p.defaultDays}일</span>
                                </div>
                              ))}
                              <button
                                type="button"
                                style={s.searchBtn}
                                disabled={busy || row.is_admin}
                                onClick={() => savePromos(row)}
                              >
                                프로모션 저장
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {msgOpenId ? (
        <div style={{ ...s.panel, marginTop: 16 }}>
          <div style={s.panelHead}>
            <div style={s.panelTitle}>관리자 문의 메시지</div>
            <button type="button" style={s.refreshBtn} onClick={() => setMsgOpenId('')}>
              닫기
            </button>
          </div>
          {msgLoading ? <div style={s.empty}>불러오는 중…</div> : null}
          {!msgLoading && !messages.length ? <div style={s.empty}>메시지가 없습니다.</div> : null}
          {messages.map((m) => (
            <div key={m.id} style={{ ...s.priceCard, marginBottom: 8 }}>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{m.message}</div>
              <div style={s.reason}>{formatDate(m.created_at)}</div>
            </div>
          ))}
        </div>
      ) : null}
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
  pricingBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(201,168,76,0.55)',
    background: 'rgba(201,168,76,0.22)',
    color: 'var(--gold-light)',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
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
  setupBox: {
    marginBottom: 16,
    padding: '16px 18px',
    borderRadius: 12,
    border: '1px solid rgba(232,148,58,0.45)',
    background: 'rgba(232,148,58,0.1)',
    color: '#f3c08a',
  },
  setupTitle: { fontSize: 14, fontWeight: 600, color: '#ffd19a', marginBottom: 8 },
  setupBody: { fontSize: 12, lineHeight: 1.5, marginBottom: 10 },
  setupList: { margin: '0 0 12px 18px', padding: 0, fontSize: 12, lineHeight: 1.7 },
  setupLink: { color: '#ffd19a', fontWeight: 600 },
  setupActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  setupBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(201,168,76,0.5)',
    background: 'rgba(201,168,76,0.2)',
    color: 'var(--gold-light)',
    fontSize: 12,
    fontWeight: 600,
  },
  setupBtnGhost: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(243,192,138,0.35)',
    background: 'transparent',
    color: '#f3c08a',
    fontSize: 12,
    textDecoration: 'none',
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
  okBanner: {
    marginBottom: 12,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid rgba(46,192,138,0.35)',
    background: 'rgba(46,192,138,0.1)',
    color: '#7dffc4',
    fontSize: 12,
  },
  panel: {
    background: 'var(--night2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    minWidth: 180,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border2)',
    background: 'var(--night3)',
    color: 'var(--text)',
    fontSize: 12,
    marginBottom: 6,
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
  priceCard: {
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 12,
    background: 'rgba(0,0,0,0.15)',
  },
  priceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginTop: 4,
  },
  priceItem: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    background: 'rgba(0,0,0,0.12)',
    minWidth: 0,
  },
  fieldLabel: { display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 1080 },
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
  reason: { marginTop: 4, fontSize: 10, color: 'var(--muted)', maxWidth: 220 },
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
