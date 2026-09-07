import {
  getBridgeSecret,
  isSchemaMissing,
  requireAtheriumUser,
  sendJson,
  ttkcClient,
} from '../../../_lib/ttkc.js'

export default async function handler(req, res) {
  const auth = await requireAtheriumUser(req)
  if (!auth.user) {
    return sendJson(res, 401, {
      error: 'Unauthorized',
      reason: auth.reason,
    })
  }

  const id = req.query?.id
  if (!id) return sendJson(res, 400, { error: 'Missing member id' })

  const ttkc = ttkcClient()

  if (req.method === 'GET') {
    const { data, error } = await ttkc.rpc('atherium_ttkc_member_messages', {
      p_secret: getBridgeSecret(),
      p_profile_id: id,
    })
    if (!error) return sendJson(res, 200, { messages: data || [] })
    if (isSchemaMissing(error)) {
      return sendJson(res, 503, {
        error: '메시지 기능을 쓰려면 atherium_admin_ttkc_fix.sql 을 실행하세요.',
        setupRequired: true,
      })
    }
    return sendJson(res, 500, { error: error.message || 'Failed to load messages' })
  }

  if (req.method === 'PATCH') {
    const { data, error } = await ttkc.rpc('atherium_ttkc_mark_messages_read', {
      p_secret: getBridgeSecret(),
      p_profile_id: id,
    })
    if (!error) return sendJson(res, 200, data || { ok: true })
    if (isSchemaMissing(error)) {
      return sendJson(res, 503, {
        error: '메시지 기능을 쓰려면 atherium_admin_ttkc_fix.sql 을 실행하세요.',
        setupRequired: true,
      })
    }
    return sendJson(res, 500, { error: error.message || 'Failed to mark read' })
  }

  return sendJson(res, 405, { error: 'Method not allowed' })
}
