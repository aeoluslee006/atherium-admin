import {
  getBridgeSecret,
  isSchemaMissing,
  requireAtheriumUser,
  sendJson,
  ttkcClient,
} from '../_lib/ttkc.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })

  const user = await requireAtheriumUser(req)
  if (!user) return sendJson(res, 401, { error: 'Unauthorized' })

  const ttkc = ttkcClient()
  const { data, error } = await ttkc.rpc('atherium_ttkc_overview', {
    p_secret: getBridgeSecret(),
  })

  if (!error) {
    return sendJson(res, 200, {
      stats: {
        totalVisitors: data?.total_visitors ?? 0,
        uniqueVisitors: data?.unique_visitors ?? 0,
        memberCount: data?.member_count ?? 0,
        activeMembers: data?.active_members ?? 0,
        bannedMembers: data?.banned_members ?? 0,
        suspendedMembers: data?.suspended_members ?? 0,
        pointsPurchasedTotal: data?.points_purchased_total ?? 0,
        pointsBalanceTotal: data?.points_balance_total ?? 0,
      },
      schemaReady: true,
    })
  }

  if (!isSchemaMissing(error)) {
    return sendJson(res, 500, { error: error.message || 'Failed to load overview' })
  }

  // Fallback before SQL migration is applied
  const { data: profiles, error: profileError, count } = await ttkc
    .from('profiles')
    .select('id, is_banned, suspended_until', { count: 'exact' })

  if (profileError) {
    return sendJson(res, 500, { error: profileError.message })
  }

  const now = Date.now()
  const rows = profiles || []
  const banned = rows.filter((p) => p.is_banned).length
  const suspended = rows.filter(
    (p) => p.suspended_until && new Date(p.suspended_until).getTime() >= now
  ).length

  return sendJson(res, 200, {
    stats: {
      totalVisitors: 0,
      uniqueVisitors: 0,
      memberCount: count ?? rows.length,
      activeMembers: rows.length - banned,
      bannedMembers: banned,
      suspendedMembers: suspended,
      pointsPurchasedTotal: 0,
      pointsBalanceTotal: 0,
    },
    schemaReady: false,
    setupHint:
      'Supabase SQL Editor에서 tulip-town-app/supabase/atherium_admin_schema.sql 을 실행하면 방문자·전화·포인트가 활성화됩니다.',
  })
}
