import {
  getBridgeSecret,
  isSchemaMissing,
  readJson,
  requireAtheriumUser,
  sendJson,
  ttkcClient,
} from '../_lib/ttkc.js'

export default async function handler(req, res) {
  const auth = await requireAtheriumUser(req)
  if (!auth.user) {
    return sendJson(res, 401, {
      error: 'Unauthorized',
      reason: auth.reason,
    })
  }

  const ttkc = ttkcClient()

  if (req.method === 'GET') {
    const { data, error } = await ttkc.rpc('atherium_ttkc_pricing_list', {
      p_secret: getBridgeSecret(),
    })
    if (!error) return sendJson(res, 200, { settings: data || [] })
    if (isSchemaMissing(error)) {
      // Direct table fallback
      const { data: rows, error: tableErr } = await ttkc
        .from('pricing_settings')
        .select('*')
        .order('key')
      if (!tableErr) return sendJson(res, 200, { settings: rows || [], schemaReady: false })
      return sendJson(res, 503, {
        error: '단가 관리를 쓰려면 atherium_admin_ttkc_fix.sql 을 실행하세요.',
        setupRequired: true,
      })
    }
    return sendJson(res, 500, { error: error.message || 'Failed to load pricing' })
  }

  if (req.method === 'PATCH') {
    const body = await readJson(req)
    if (!body.key) return sendJson(res, 400, { error: 'key required' })
    const { data, error } = await ttkc.rpc('atherium_ttkc_pricing_update', {
      p_secret: getBridgeSecret(),
      p_key: body.key,
      p_amount_cents: body.amount_cents != null ? Number(body.amount_cents) : null,
      p_label: body.label ?? null,
      p_is_active: typeof body.is_active === 'boolean' ? body.is_active : null,
      p_actor_id: auth.user.id,
    })
    if (!error) return sendJson(res, 200, { setting: data })
    if (isSchemaMissing(error)) {
      return sendJson(res, 503, {
        error: '단가 관리를 쓰려면 atherium_admin_ttkc_fix.sql 을 실행하세요.',
        setupRequired: true,
      })
    }
    return sendJson(res, 400, { error: error.message || 'Pricing update failed' })
  }

  return sendJson(res, 405, { error: 'Method not allowed' })
}
