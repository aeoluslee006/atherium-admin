import {
  getBridgeSecret,
  isSchemaMissing,
  requireAtheriumUser,
  sendJson,
  ttkcClient,
} from '../_lib/ttkc.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })

  const auth = await requireAtheriumUser(req)
  if (!auth.user) {
    return sendJson(res, 401, {
      error: 'Unauthorized',
      reason: auth.reason,
    })
  }

  const ttkc = ttkcClient()
  const { data, error } = await ttkc.rpc('atherium_ttkc_overview', {
    p_secret: getBridgeSecret(),
  })

  if (!error) {
    return sendJson(res, 200, {
      stats: {
        totalVisitors: data?.total_visitors ?? 0,
        uniqueVisitors: data?.unique_visitors ?? 0,
        todayVisitors: data?.today_visitors ?? 0,
        todayUniqueVisitors: data?.today_unique_visitors ?? 0,
        memberCount: data?.member_count ?? 0,
        activeMembers: data?.active_members ?? 0,
        bannedMembers: data?.banned_members ?? 0,
        suspendedMembers: data?.suspended_members ?? 0,
        unreadMessages: data?.unread_messages ?? 0,
      },
      schemaReady: true,
    })
  }

  if (!isSchemaMissing(error)) {
    return sendJson(res, 500, { error: error.message || 'Failed to load overview' })
  }

  const { data: profiles, error: profileError, count } = await ttkc
    .from('profiles')
    .select('id, is_banned, suspended_until, status', { count: 'exact' })

  if (profileError) {
    return sendJson(res, 500, { error: profileError.message })
  }

  const now = Date.now()
  const rows = profiles || []
  const banned = rows.filter((p) => p.status === 'deleted' || p.is_banned).length
  const suspended = rows.filter(
    (p) =>
      p.status === 'hold' ||
      (p.suspended_until && new Date(p.suspended_until).getTime() >= now && p.status !== 'deleted')
  ).length

  return sendJson(res, 200, {
    stats: {
      totalVisitors: 0,
      uniqueVisitors: 0,
      todayVisitors: 0,
      todayUniqueVisitors: 0,
      memberCount: count ?? rows.length,
      activeMembers: rows.length - banned,
      bannedMembers: banned,
      suspendedMembers: suspended,
      unreadMessages: 0,
    },
    schemaReady: false,
    setupHint:
      'Supabase SQL Editor에서 atherium_admin_ttkc_fix.sql 을 실행하면 등급·프로모션·메시지가 활성화됩니다.',
  })
}
