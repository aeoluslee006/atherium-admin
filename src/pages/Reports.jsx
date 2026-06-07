import React, { useEffect, useMemo, useState } from 'react'
import { fetchAtheriumCustomers, formatMoney, summarizeCustomers } from '../lib/customerData'

const INDUSTRY_COLORS = ['var(--cosmo)', 'var(--gold)', 'var(--success)', 'var(--enterprise)', 'var(--warn)', 'var(--danger)']

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetchAtheriumCustomers().then(({ data, error: fetchError }) => {
      if (!alive) return
      if (fetchError) {
        setError(fetchError.message)
        setStats(null)
      } else {
        setStats(summarizeCustomers(data))
      }
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const industrySlices = useMemo(() => {
    if (!stats) return []
    const entries = Object.entries(stats.industryCounts).sort((a, b) => b[1] - a[1])
    const total = stats.total || 1
    return entries.map(([label, count], i) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
      color: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length],
    }))
  }, [stats])

  if (loading) {
    return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading reports…</div>
  }

  if (error) {
    return <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>
  }

  const totalPaid = stats.platformRows.reduce((n, r) => n + r.paid, 0)
  const totalFree = stats.platformRows.reduce((n, r) => n + r.free, 0)
  const totalInactive = stats.platformRows.reduce((n, r) => n + r.inactive, 0)
  const paidRate = stats.total ? `${((totalPaid / stats.total) * 100).toFixed(1)}%` : '0%'

  const revenueTotal = stats.cosmoMrr + stats.entMrr || 1
  const cosmoRevPct = Math.round((stats.cosmoMrr / revenueTotal) * 100)
  const entRevPct = 100 - cosmoRevPct

  const metrics = [
    { label: 'Total ARR', val: formatMoney(stats.arr, { compact: true }), change: 'MRR × 12 from live data', up: stats.arr > 0 },
    { label: 'New This Month', val: String(stats.newThisMonth), change: 'Customers added this month', up: stats.newThisMonth > 0 },
    { label: 'Avg. Revenue / Customer', val: formatMoney(stats.avgRevenue), change: 'Across all customers', up: stats.avgRevenue > 0 },
    { label: 'Paid Customers', val: String(stats.paidCount), change: `${stats.trialCount} on free trial`, up: true },
  ]

  return (
    <div>
      <div style={s.header}>
        <div style={s.title}>Reports & Analytics</div>
        <div style={s.sub}>Consolidated view from atherium_customers</div>
      </div>

      <div style={s.metricsGrid}>
        {metrics.map(m => (
          <div key={m.label} style={s.metric}>
            <div style={s.mLabel}>{m.label}</div>
            <div style={s.mVal}>{m.val}</div>
            <div style={{ ...s.mChange, color: m.up ? 'var(--success)' : 'var(--danger)' }}>
              <i className={`ti ${m.up ? 'ti-trending-up' : 'ti-trending-down'}`} style={{ fontSize: 12 }} aria-hidden="true" />
              {m.change}
            </div>
          </div>
        ))}
      </div>

      <div style={s.twoCol}>
        <div style={s.panel}>
          <div style={s.panelTitle}>Revenue Split by Platform</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <svg width="100" height="100" viewBox="0 0 100 100" aria-label="Revenue donut chart">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--night4)" strokeWidth="16" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--enterprise)" strokeWidth="16"
                strokeDasharray={`${entRevPct * 2.39} ${239 - entRevPct * 2.39}`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--cosmo)" strokeWidth="16"
                strokeDasharray={`${cosmoRevPct * 2.39} ${239 - cosmoRevPct * 2.39}`} strokeDashoffset={`${-entRevPct * 2.39}`} transform="rotate(-90 50 50)" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={s.legendItem}><div style={{ ...s.legendDot, background: 'var(--enterprise)' }} />Cosmoenterprise<span style={s.legendVal}>{entRevPct}%</span></div>
              <div style={s.legendItem}><div style={{ ...s.legendDot, background: 'var(--cosmo)' }} />Cosmonova<span style={s.legendVal}>{cosmoRevPct}%</span></div>
            </div>
          </div>
        </div>

        <div style={s.panel}>
          <div style={s.panelTitle}>Customer Mix by Industry</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {industrySlices.length > 0 ? (
              <>
                <svg width="100" height="100" viewBox="0 0 100 100" aria-label="Industry donut chart">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="var(--night4)" strokeWidth="16" />
                  {industrySlices.reduce((acc, slice, i) => {
                    const dash = slice.pct * 2.39
                    const offset = acc.offset
                    acc.nodes.push(
                      <circle
                        key={slice.label}
                        cx="50" cy="50" r="38" fill="none"
                        stroke={slice.color} strokeWidth="16"
                        strokeDasharray={`${dash} ${239 - dash}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 50 50)"
                      />
                    )
                    acc.offset += dash
                    return acc
                  }, { nodes: [], offset: 0 }).nodes}
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {industrySlices.map(item => (
                    <div key={item.label} style={s.legendItem}>
                      <div style={{ ...s.legendDot, background: item.color }} />{item.label}<span style={s.legendVal}>{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>No industry data yet</div>
            )}
          </div>
        </div>
      </div>

      <div style={s.fullPanel}>
        <div style={{ ...s.panelTitle, marginBottom: 14 }}>Subscription Status Breakdown</div>
        <table style={s.table}>
          <thead>
            <tr>
              {['Platform', 'Paid (유료)', 'Free Trial', 'Inactive', 'Total', 'Paid Rate'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.platformRows.map(r => (
              <tr key={r.platform}>
                <td style={s.td}><span style={r.type === 'cosmo' ? s.badgeCosmo : s.badgeEnt}>{r.platform}</span></td>
                <td style={{ ...s.td, color: 'var(--success)' }}>{r.paid}</td>
                <td style={{ ...s.td, color: 'var(--gold)' }}>{r.free}</td>
                <td style={{ ...s.td, color: 'var(--muted)' }}>{r.inactive}</td>
                <td style={{ ...s.td, color: 'var(--bright)', fontWeight: 500 }}>{r.total}</td>
                <td style={{ ...s.td, color: 'var(--success)' }}>{r.rate}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid var(--border2)' }}>
              <td style={{ ...s.td, color: 'var(--gold)', fontWeight: 500 }}>Total</td>
              <td style={{ ...s.td, color: 'var(--success)', fontWeight: 500 }}>{totalPaid}</td>
              <td style={{ ...s.td, color: 'var(--gold)' }}>{totalFree}</td>
              <td style={{ ...s.td, color: 'var(--muted)' }}>{totalInactive}</td>
              <td style={{ ...s.td, color: 'var(--bright)', fontWeight: 600 }}>{stats.total}</td>
              <td style={{ ...s.td, color: 'var(--success)' }}>{paidRate}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

const s = {
  header: { marginBottom: 20 },
  title: { fontFamily: "'Cinzel', serif", fontSize: 16, color: 'var(--bright)', letterSpacing: 0.5 },
  sub: { fontSize: 12, color: 'var(--muted)', marginTop: 3 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 },
  metric: { background: 'var(--night3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 },
  mLabel: { fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  mVal: { fontSize: 22, fontWeight: 500, color: 'var(--bright)', fontFamily: "'Cinzel', serif" },
  mChange: { fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  panel: { background: 'var(--night3)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 },
  panelTitle: { fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text)' },
  legendDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  legendVal: { marginLeft: 'auto', color: 'var(--muted)', minWidth: 32, textAlign: 'right' },
  fullPanel: { background: 'var(--night3)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' },
  td: { fontSize: 12, color: 'var(--text)', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  badgeCosmo: { display: 'inline-flex', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(79,143,232,0.12)', color: 'var(--cosmo)', border: '1px solid rgba(79,143,232,0.25)' },
  badgeEnt: { display: 'inline-flex', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(123,92,240,0.12)', color: 'var(--enterprise)', border: '1px solid rgba(123,92,240,0.25)' },
}
