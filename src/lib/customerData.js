import { supabase } from './supabase'

const CUSTOMER_SELECT =
  'id, system_name, company_name, email, industry, subscription_status, features, monthly_fee, status, created_at'

const LOCATION_SELECT = 'id, nickname, city, state, active'

export function parseMonthlyFee(fee) {
  if (fee == null || fee === '') return 0
  const n = parseFloat(String(fee).replace(/[$,]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function formatMoney(amount, { compact = false } = {}) {
  if (!amount) return '$0'
  if (compact && amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`
  if (compact && amount >= 1_000) return `$${Math.round(amount).toLocaleString()}`
  return `$${Math.round(amount).toLocaleString()}`
}

export function isCosmonova(systemName) {
  return String(systemName || '').toLowerCase() === 'cosmonova'
}

export function platformLabel(systemName) {
  return isCosmonova(systemName) ? 'Cosmonova' : 'Cosmoenterprise'
}

export function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function businessNameFromNickname(nickname) {
  const nick = String(nickname || '').trim()
  const dash = nick.lastIndexOf(' - ')
  if (dash > 0) return nick.slice(0, dash).trim()
  return nick || 'Unknown'
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function ownerEmail(staffRow) {
  if (!staffRow) return ''
  return staffRow.work_email || staffRow.email || staffRow.personal_email || ''
}

function countStoresForCompany(companyName, locations) {
  const key = String(companyName || '').toLowerCase()
  return (locations || []).filter((loc) => {
    if (loc.active === false) return false
    return businessNameFromNickname(loc.nickname).toLowerCase() === key
  }).filter((loc) => !String(loc.nickname || '').toUpperCase().includes('OFFICE')).length
}

function featuresForCosmonovaBusiness(locationCount) {
  const features = ['POS', 'Inventory']
  if (locationCount > 1) features.push('Schedule')
  if (locationCount > 0) features.push('Dashboard')
  return features
}

export function deriveCosmonovaCustomers(locations, owners) {
  const activeLocations = (locations || []).filter((loc) => loc.active !== false)
  const groups = new Map()

  activeLocations.forEach((loc) => {
    const company = businessNameFromNickname(loc.nickname)
    const key = company.toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, { company_name: company, locations: [] })
    }
    groups.get(key).locations.push(loc)
  })

  const ownerList = (owners || []).filter((o) => String(o.role || '').toLowerCase() === 'owner')
  const primaryOwner =
    ownerList.find((o) => o.active !== false) ||
    ownerList[0] ||
    null

  return Array.from(groups.values()).map((group) => {
    const locs = group.locations
    const storeCount = locs.filter((l) => !String(l.nickname || '').toUpperCase().includes('OFFICE')).length
    const totalCount = locs.length
    const industry = group.company_name.toUpperCase().includes('BANEE') ? 'Retail' : 'Retail'

    return {
      id: `cosmonova:${slugify(group.company_name)}`,
      system_name: 'cosmonova',
      company_name: group.company_name,
      email: ownerEmail(primaryOwner),
      industry,
      subscription_status: '유료',
      features: featuresForCosmonovaBusiness(storeCount),
      monthly_fee: null,
      status: 'Active',
      created_at: null,
      _source: 'cosmonova',
      location_count: storeCount,
      total_location_count: totalCount,
    }
  })
}

function mergeCustomers(manualRows, derivedRows, locations) {
  const manualKeys = new Set(
    (manualRows || []).map((r) => `${String(r.system_name).toLowerCase()}:${String(r.company_name).toLowerCase()}`)
  )
  const extras = (derivedRows || []).filter(
    (r) => !manualKeys.has(`${String(r.system_name).toLowerCase()}:${String(r.company_name).toLowerCase()}`)
  )
  const merged = [...(manualRows || []), ...extras]
  return merged.map((row) => {
    if (row.location_count != null) return row
    const count = isCosmonova(row.system_name)
      ? countStoresForCompany(row.company_name, locations)
      : 0
    return { ...row, location_count: count }
  })
}

export async function fetchAtheriumCustomers() {
  const [customRes, locRes, staffRes] = await Promise.all([
    supabase.from('atherium_customers').select(CUSTOMER_SELECT).order('created_at', { ascending: false }),
    supabase.from('locations').select(LOCATION_SELECT).eq('active', true).order('id', { ascending: true }),
    supabase.from('staff').select('id,name,role,email,work_email,personal_email,active').eq('role', 'owner'),
  ])

  const locations = locRes.data || []
  const manual = customRes.data || []
  const derived = locRes.error ? [] : deriveCosmonovaCustomers(locations, staffRes.data)
  const merged = mergeCustomers(manual, derived, locations)

  const errors = []
  if (customRes.error) errors.push(customRes.error.message)
  if (locRes.error) errors.push(locRes.error.message)
  if (staffRes.error) errors.push(staffRes.error.message)

  if (!merged.length && errors.length) {
    return { data: [], error: { message: errors.join(' · ') } }
  }

  return {
    data: merged,
    error: errors.length && !merged.length ? { message: errors.join(' · ') } : null,
    meta: {
      manualCount: manual.length,
      cosmonovaCount: derived.length,
      warnings: errors,
    },
  }
}

export function summarizeCustomers(rows) {
  const list = rows || []
  const cosmo = list.filter((r) => isCosmonova(r.system_name))
  const ent = list.filter((r) => !isCosmonova(r.system_name))
  const active = list.filter((r) => r.status === 'Active')
  const paid = list.filter((r) => r.subscription_status === '유료')
  const trial = list.filter((r) => r.subscription_status === '무료체험')
  const inactive = list.filter((r) => r.status !== 'Active')

  const mrr = (subset) =>
    subset
      .filter((r) => r.status === 'Active' && r.subscription_status === '유료')
      .reduce((sum, r) => sum + parseMonthlyFee(r.monthly_fee), 0)

  const totalMrr = mrr(list)
  const cosmoMrr = mrr(cosmo)
  const entMrr = mrr(ent)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = list.filter((r) => r.created_at && new Date(r.created_at) >= monthStart)

  const industryCounts = {}
  list.forEach((r) => {
    const key = r.industry || 'Other'
    industryCounts[key] = (industryCounts[key] || 0) + 1
  })

  const platformRows = [
    buildPlatformRow('Cosmonova', 'cosmo', cosmo),
    buildPlatformRow('Cosmoenterprise', 'ent', ent),
  ]

  const paidActive = list.filter((r) => r.subscription_status === '유료' && r.status === 'Active').length
  const churnRate = list.length ? ((inactive.length / list.length) * 100).toFixed(1) : '0.0'

  const topCustomers = [...list]
    .sort((a, b) => parseMonthlyFee(b.monthly_fee) - parseMonthlyFee(a.monthly_fee))
    .slice(0, 5)

  const recentActivity = list.slice(0, 6).map((r) => ({
    type: isCosmonova(r.system_name) ? 'cosmo' : 'ent',
    icon: 'ti-user-plus',
    name: `Customer — ${r.company_name}`,
    detail: `${platformLabel(r.system_name)} · ${r.industry || '—'} · ${r.subscription_status}${r.location_count ? ` · ${r.location_count} locations` : ''}`,
    time: timeAgo(r.created_at),
  }))

  return {
    total: list.length,
    cosmoCount: cosmo.length,
    entCount: ent.length,
    activeCount: active.length,
    paidCount: paid.length,
    trialCount: trial.length,
    inactiveCount: inactive.length,
    paidActive,
    totalMrr,
    cosmoMrr,
    entMrr,
    arr: totalMrr * 12,
    newThisMonth: newThisMonth.length,
    avgRevenue: list.length ? totalMrr / list.length : 0,
    churnRate,
    industryCounts,
    platformRows,
    topCustomers,
    recentActivity,
  }
}

function buildPlatformRow(label, type, rows) {
  const paid = rows.filter((r) => r.subscription_status === '유료').length
  const free = rows.filter((r) => r.subscription_status === '무료체험').length
  const inactive = rows.filter((r) => r.status !== 'Active').length
  const total = rows.length
  const rate = total ? `${((paid / total) * 100).toFixed(1)}%` : '0%'
  return { platform: label, type, paid, free, inactive, total, rate }
}
