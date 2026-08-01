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

  const user = await requireAtheriumUser(req)
  if (!user) return sendJson(res, 401, { error: 'Unauthorized' })

  const id = req.query?.id
  if (!id) return sendJson(res, 400, { error: 'Missing member id' })

  const body = await readJson(req)
  const action = body.action
  if (!['ban', 'suspend', 'clear'].includes(action)) {
    return sendJson(res, 400, { error: 'action must be ban | suspend | clear' })
  }

  const ttkc = ttkcClient()
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
        '정지/해지 기능을 쓰려면 Supabase SQL Editor에서 atherium_admin_schema.sql 을 먼저 실행하세요.',
      setupRequired: true,
    })
  }

  return sendJson(res, 400, { error: error.message || 'Moderation failed' })
}
