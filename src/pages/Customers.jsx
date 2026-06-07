import React, { useEffect, useState } from 'react'
import { fetchAtheriumCustomers } from '../lib/customerData'

const FILTERS = ['All Platforms', 'Cosmonova', 'Cosmoenterprise', 'Active', 'Deactivated', 'Free Trial', 'Paid']

function normalizeFeatures(features) {
  if (Array.isArray(features)) return features
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Platforms')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      const { data, error: fetchError } = await fetchAtheriumCustomers()
      if (!alive) return
      if (fetchError) {
        setError(fetchError.message)
        setCustomers([])
      } else {
        setCustomers(data || [])
      }
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  const filtered = customers.filter((c) => {
    const name = c.company_name || ''
    const email = c.email || ''
    const industry = c.industry || ''
    const matchSearch = !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      industry.toLowerCase().includes(search.toLowerCase())
    const system = (c.system_name || '').toLowerCase()
    const sub = c.subscription_status || ''
    const status = c.status || ''
    const matchFilter =
      activeFilter === 'All Platforms' ? true :
      activeFilter === 'Cosmonova' ? system === 'cosmonova' :
      activeFilter === 'Cosmoenterprise' ? system === 'cosmoenterprise' :
      activeFilter === 'Active' ? status === 'Active' :
      activeFilter === 'Deactivated' ? status === 'Deactivated' :
      activeFilter === 'Free Trial' ? sub === '무료체험' :
      activeFilter === 'Paid' ? sub === '유료' : true
    return matchSearch && matchFilter
  })

  return (
    <div>
      <div style={s.header}>
        <div style={s.title}>Customer Management</div>
        <div style={s.sub}>All registered businesses across platforms</div>
      </div>

      <div style={s.searchBar}>
        <i className="ti ti-search" style={{ color: 'var(--muted)', fontSize: 15 }} aria-hidden="true" />
        <input
          type="text"
          placeholder="Search by business name, email, or industry..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={s.searchInput}
        />
        {search && (
          <i className="ti ti-x" style={{ color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }} onClick={() => setSearch('')} aria-label="Clear search" />
        )}
      </div>

      <div style={s.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            style={{ ...s.filterBtn, ...(activeFilter === f ? s.filterActive : {}) }}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
        <button style={s.addBtn}>
          <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
          Add Customer
        </button>
      </div>

      <div style={s.panel}>
        {error && (
          <div style={s.errorBanner}>
            {error}
            {error.includes('atherium_customers') && (
              <span style={{ display: 'block', marginTop: 6, fontSize: 10, opacity: 0.85 }}>
                Run the SQL migration in supabase/migrations/ on your Supabase project.
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
          {loading
            ? 'Loading customers…'
            : `Showing ${filtered.length} of ${customers.length} customers · includes live Cosmonova tenants`}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>System</th>
                <th style={s.th}>등록회사명</th>
                <th style={s.th}>등록자 이메일</th>
                <th style={s.th}>Business Industry</th>
                <th style={s.th}>Locations</th>
                <th style={s.th}>구독상태</th>
                <th style={s.th}>Business Mgmt Features</th>
                <th style={s.th}>매월 구독비</th>
                <th style={s.th}>고객 메시지</th>
                <th style={s.th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.map((c) => {
                const features = normalizeFeatures(c.features)
                const system = (c.system_name || '').toLowerCase()
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.querySelectorAll('td').forEach(td => td.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => e.currentTarget.querySelectorAll('td').forEach(td => td.style.background = '')}
                  >
                    <td style={s.td}>
                      <span style={system === 'cosmonova' ? s.badgeCosmo : s.badgeEnt}>
                        {c.system_name}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontWeight: 500, color: 'var(--bright)' }}>{c.company_name}</td>
                    <td style={{ ...s.td, color: 'var(--muted)', fontSize: 11 }}>{c.email}</td>
                    <td style={s.td}>{c.industry || '—'}</td>
                    <td
                      style={{ ...s.td, textAlign: 'center', fontWeight: 600, color: 'var(--bright)' }}
                      title={c.total_location_count && c.total_location_count !== c.location_count
                        ? `${c.location_count} stores · ${c.total_location_count} total (incl. office)`
                        : `${c.location_count ?? 0} location(s)`}
                    >
                      {c.location_count ?? '—'}
                    </td>
                    <td style={s.td}>
                      <span style={c.subscription_status === '무료체험' ? s.badgeFree : s.badgeActive2}>{c.subscription_status}</span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {features.map(f => (
                          <span key={f} style={system === 'cosmonova' ? s.featureCosmo : s.featureEnt}>{f}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...s.td, color: c.monthly_fee ? 'var(--gold)' : 'var(--muted)' }}>{c.monthly_fee || '—'}</td>
                    <td style={s.td}>
                      <i className="ti ti-message-circle" style={{ color: 'var(--muted)', fontSize: 16, cursor: 'pointer' }} aria-label={`Message ${c.company_name}`} />
                    </td>
                    <td style={s.td}>
                      <span style={c.status === 'Active' ? s.badgeStatusActive : s.badgeStatusInactive}>{c.status}</span>
                    </td>
                  </tr>
                )
              })}
              {!loading && filtered.length === 0 && !error && (
                <tr>
                  <td colSpan={10} style={{ ...s.td, textAlign: 'center', color: 'var(--muted)', padding: '32px 12px' }}>
                    No customers found
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={10} style={{ ...s.td, textAlign: 'center', color: 'var(--muted)', padding: '32px 12px' }}>
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const s = {
  header: { marginBottom: 20 },
  title: { fontFamily: "'Cinzel', serif", fontSize: 16, color: 'var(--bright)', letterSpacing: 0.5 },
  sub: { fontSize: 12, color: 'var(--muted)', marginTop: 3 },
  searchBar: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--night4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', marginBottom: 16 },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, flex: 1, fontFamily: "'Outfit', sans-serif" },
  filters: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  filterBtn: { padding: '5px 14px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', transition: 'all 0.2s' },
  filterActive: { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'rgba(201,168,76,0.07)' },
  addBtn: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border2)', background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', fontFamily: "'Outfit', sans-serif" },
  panel: { background: 'var(--night3)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20 },
  errorBanner: { background: 'rgba(232,79,79,0.1)', border: '1px solid rgba(232,79,79,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--danger)', marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  th: { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  td: { fontSize: 12, color: 'var(--text)', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' },
  badgeCosmo: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(79,143,232,0.12)', color: 'var(--cosmo)', border: '1px solid rgba(79,143,232,0.25)' },
  badgeEnt: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(123,92,240,0.12)', color: 'var(--enterprise)', border: '1px solid rgba(123,92,240,0.25)' },
  badgeFree: { display: 'inline-flex', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' },
  badgeActive2: { display: 'inline-flex', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(46,192,138,0.12)', color: 'var(--success)', border: '1px solid rgba(46,192,138,0.25)' },
  featureCosmo: { background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', fontSize: 9, padding: '2px 6px', borderRadius: 4 },
  featureEnt: { background: 'rgba(123,92,240,0.1)', color: 'var(--enterprise)', fontSize: 9, padding: '2px 6px', borderRadius: 4 },
  badgeStatusActive: { display: 'inline-flex', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(46,192,138,0.15)', color: 'var(--success)', border: '1px solid rgba(46,192,138,0.3)' },
  badgeStatusInactive: { display: 'inline-flex', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'rgba(136,146,170,0.1)', color: 'var(--muted)', border: '1px solid rgba(136,146,170,0.2)' },
}
