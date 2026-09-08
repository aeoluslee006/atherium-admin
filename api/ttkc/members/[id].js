import {
  getBridgeSecret,
  isSchemaMissing,
  readJson,
  requireAtheriumUser,
  sendJson,
  ttkcClient,
} from '../../_lib/ttkc.js'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return sendJson(res, 405, { error: 'Method not allowed' })

  const auth = await requireAtheriumUser(req)
  if (!auth.user) {
    return sendJson(res, 401, {
      error: 'Unauthorized',
      reason: auth.reason,
    })
  }

  const id = req.query?.id
  if (!id) return sendJson(res, 400, { error: 'Missing member id' })

  const body = await readJson(req)
  const ttkc = ttkcClient()

  // Per-product promo update
  if (body.product_key) {
    const { data, error } = await ttkc.rpc('atherium_ttkc_set_promo', {
      p_secret: getBridgeSecret(),
      p_profile_id: id,
      p_product_key: body.product_key,
      p_promo_end_date: body.promo_end_date || null,
      p_actor_id: auth.user.id,
    })
    if (!error) return sendJson(res, 200, { promotion: data })
    if (isSchemaMissing(error)) {
      return sendJson(res, 503, {
        error: '프로모션 기능을 쓰려면 atherium_admin_ttkc_fix.sql 을 실행하세요.',
        setupRequired: true,
      })
    }
    return sendJson(res, 400, { error: error.message || 'Promo update failed' })
  }

  const action = body.action
  if (!['ban', 'suspend', 'clear', 'hold', 'delete', 'unhold'].includes(action)) {
    return sendJson(res, 400, { error: 'action must be ban|suspend|clear|hold|delete|unhold' })
  }

  const { data, error } = await ttkc.rpc('atherium_ttkc_moderate_member', {
    p_secret: getBridgeSecret(),
    p_id: id,
    p_action: action,
    p_reason: body.reason || null,
    p_days: body.days != null ? Number(body.days) : null,
  })

  if (!error) {
    return sendJson(res, 200, { member: data })
  }

  if (isSchemaMissing(error)) {
    return sendJson(res, 503, {
      error:
        '정지/해지 기능을 쓰려면 Supabase SQL Editor에서 atherium_admin_ttkc_fix.sql 을 먼저 실행하세요.',
      setupRequired: true,
    })
  }

  return sendJson(res, 400, { error: error.message || 'Moderation failed' })
}
