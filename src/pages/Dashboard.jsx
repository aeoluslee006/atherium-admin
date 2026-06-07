import React, { useEffect, useState } from 'react'
import { fetchAtheriumCustomers, formatMoney, isCosmonova, platformLabel, summarizeCustomers } from '../lib/customerData'

export default function Dashboard() {
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

  const periodLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (loading) {
    return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading dashboard…</div>
  }

  if (error) {
    return <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>
  }

  const metrics = [
    {
      label: 'Total Customers',
      val: String(stats.total),
      change: `${stats.newThisMonth} new this month`,
      up: stats.newThisMonth > 0,
      sub: [
        { dot: 'cosmo', text: `${stats.cosmoCount} Cosmonova` },
        { dot: 'ent', text: `${stats.entCount} Enterprise` },
      ],
    },
    {
      label: 'MRR',
      val: formatMoney(stats.totalMrr, { compact: true }),
      change: 'From paid active customers',
      up: stats.totalMrr > 0,
      sub: [
        { dot: 'cosmo', text: formatMoney(stats.cosmoMrr) },
        { dot: 'ent', text: formatMoney(stats.entMrr) },
      ],
    },
    {
      label: 'Active Subscriptions',
      val: String(stats.paidActive),
      change: `${stats.trialCount} on free trial`,
      up: true,
      sub: [
        { dot: 'cosmo', text: `${stats.platformRows[0]?.paid || 0} paid` },
        { dot: 'ent', text: `${stats.platformRows[1]?.paid || 0} paid` },
      ],
    },
    {
      label: 'Churn Rate',
      val: `${stats.churnRate}%`,
      change: `${stats.inactiveCount} inactive accounts`,
      up: Number(stats.churnRate) <= 5,
      sub: [
        { dot: 'cosmo', text: `${stats.platformRows[0]?.inactive || 0} inactive` },
        { dot: 'ent', text: `${stats.platformRows[1]?.inactive || 0} inactive` },
      ],
    },
  ]

  const maxMrr = Math.max(stats.cosmoMrr, stats.entMrr, 1)

  return (
    <div>
      <div style={s.header}>
        <div style={s.title}>Overview</div>
        <div style={s.sub}>All platforms combined · {periodLabel}</div>
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
            <div style={s.mSplit}>
              {m.sub.map(sub => (
                <div key={sub.text} style={s.mSubItem}>
                  <div style={{ ...s.subDot, background: sub.dot === 'cosmo' ? 'var(--cosmo)' : 'var(--enterprise)' }} />
                  {sub.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={s.twoCol}>
        <div style={s.panel}>
          <div style={s.panelTitle}>
            MRR by Platform
            <span style={s.panelAction}>Live from database</span>
          </div>
          <div style={s.chartBars}>
            <div style={s.barGroup}>
              <div style={{ ...s.bar, ...s.barCosmo, height: `${(stats.cosmoMrr / maxMrr) * 100}%` }} title={formatMoney(stats.cosmoMrr)} />
            </div>
            <div style={s.barGroup}>
              <div style={{ ...s.bar, ...s.barEnt, height: `${(stats.entMrr / maxMrr) * 100}%` }} title={formatMoney(stats.entMrr)} />
            </div>
          </div>
          <div style={s.chartLabels}>
            <div style={s.chartLabel}>Cosmonova</div>
            <div style={s.chartLabel}>Cosmoenterprise</div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div style={s.legend}><div style={{ ...s.subDot, background: 'var(--cosmo)' }} />{formatMoney(stats.cosmoMrr)}</div>
            <div style={s.legend}><div style={{ ...s.subDot, background: 'var(--enterprise)' }} />{formatMoney(stats.entMrr)}</div>
          </div>
        </div>

        <div style={s.panel}>
          <div style={s.panelTitle}>Recent Customers <span style={s.panelAction}>From atherium_customers</span></div>
          <div>
            {stats.recentActivity.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: '12px 0' }}>No customers yet</div>
            )}
            {stats.recentActivity.map((a, i) => (
              <div key={i} style={{ ...s.actItem, borderBottom: i < stats.recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ ...s.actIcon, ...(a.type === 'cosmo' ? s.actCosmo : s.actEnt) }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text)' }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{a.detail}</div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.fullPanel}>
        <div style={{ ...s.panelTitle, marginBottom: 14 }}>
          Top Customers
          <span style={s.panelAction}>Sorted by monthly fee</span>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              {['Business', 'Platform', 'Industry', 'Subscription', 'MRR', 'Status'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.topCustomers.map((c) => (
              <tr key={c.id}>
                <td style={s.td}>{c.company_name}</td>
                <td style={s.td}>
                  <span style={isCosmonova(c.system_name) ? s.badgeCosmo : s.badgeEnt}>
                    {platformLabel(c.system_name)}
                  </span>
                </td>
                <td style={s.td}>{c.industry || '—'}</td>
                <td style={s.td}>{c.subscription_status}</td>
                <td style={{ ...s.td, color: 'var(--gold)' }}>{c.monthly_fee || '—'}</td>
                <td style={s.td}>
                  <span style={c.status === 'Active' ? s.badgeActive : s.badgeInactive}>{c.status}</span>
                </td>
              </tr>
            ))}
            {stats.topCustomers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...s.td, textAlign: 'center', color: 'var(--muted)' }}>No customers in database</td>
              </tr>
            )}
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
  mSplit: { display: 'flex', gap: 12, marginTop: 8 },
  mSubItem: { fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 },
  subDot: { width: 5, height: 5, borderRadius: '50%' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  panel: { background: 'var(--night3)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 },
  panelTitle: { fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  panelAction: { fontSize: 11, color: 'var(--gold)', cursor: 'pointer', letterSpacing: 0, textTransform: 'none' },
  chartBars: { display: 'flex', alignItems: 'flex-end', gap: 16, height: 80 },
  barGroup: { flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' },
  bar: { width: '100%', borderRadius: '3px 3px 0 0', minHeight: 4, transition: 'opacity 0.2s' },
  barCosmo: { background: 'var(--cosmo)' },
  barEnt: { background: 'var(--enterprise)' },
  chartLabels: { display: 'flex', gap: 16, marginTop: 6 },
  chartLabel: { flex: 1, fontSize: 9, color: 'var(--muted)', textAlign: 'center' },
  legend: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--muted)' },
  actItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' },
  actIcon: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 },
  actCosmo: { background: 'rgba(79,143,232,0.15)', color: 'var(--cosmo)' },
  actEnt: { background: 'rgba(123,92,240,0.15)', color: 'var(--enterprise)' },
  fullPanel: { background: 'var(--night3)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' },
  td: { fontSize: 12, color: 'var(--text)', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  badgeCosmo: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(79,143,232,0.12)', color: 'var(--cosmo)', border: '1px solid rgba(79,143,232,0.25)' },
  badgeEnt: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(123,92,240,0.12)', color: 'var(--enterprise)', border: '1px solid rgba(123,92,240,0.25)' },
  badgeActive: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(46,192,138,0.15)', color: 'var(--success)', border: '1px solid rgba(46,192,138,0.3)' },
  badgeInactive: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(136,146,170,0.1)', color: 'var(--muted)', border: '1px solid rgba(136,146,170,0.2)' },
}
