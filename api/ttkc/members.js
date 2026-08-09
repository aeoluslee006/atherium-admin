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

  const url = new URL(req.url, 'http://localhost')
  const q = (url.searchParams.get('q') || '').trim()

  const ttkc = ttkcClient()
  const { data, error } = await ttkc.rpc('atherium_ttkc_members', {
    p_secret: getBridgeSecret(),
    p_q: q || null,
  })

  if (!error) {
    return sendJson(res, 200, { members: data || [], schemaReady: true })
  }

  if (!isSchemaMissing(error)) {
    return sendJson(res, 500, { error: error.message || 'Failed to load members' })
  }

  let query = ttkc
    .from('profiles')
    .select('id, display_name, is_admin, is_banned, banned_reason, suspended_until, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: profiles, error: profileError } = await query
  if (profileError) return sendJson(res, 500, { error: profileError.message })

  let members = (profiles || []).map((p) => ({
    ...p,
    email: '',
    phone: '',
    points_purchased: 0,
    points_balance: 0,
  }))

  if (q) {
    const needle = q.toLowerCase()
    members = members.filter((m) => (m.display_name || '').toLowerCase().includes(needle))
  }

  return sendJson(res, 200, {
    members,
    schemaReady: false,
    setupHint:
      '회원 이메일·전화·포인트를 보려면 atherium_admin_schema.sql 을 Supabase에서 실행하세요.',
  })
}
