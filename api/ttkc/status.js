import { getBridgeSecret, sendJson, ttkcClient } from '../_lib/ttkc.js'

/** Public diagnostic — no auth required */
export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })

  const ttkc = ttkcClient()
  const { data, error } = await ttkc.rpc('atherium_ttkc_overview', {
    p_secret: getBridgeSecret(),
  })

  if (!error) {
    return sendJson(res, 200, {
      ok: true,
      schemaReady: true,
      stats: data,
      message: 'TTKC admin schema is ready.',
    })
  }

  const { count, error: profileError } = await ttkc
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  return sendJson(res, 200, {
    ok: false,
    schemaReady: false,
    memberCountFallback: profileError ? null : count ?? 0,
    rpcError: error.message,
    profileError: profileError?.message || null,
    message:
      'Supabase SQL이 아직 실행되지 않았습니다. atherium_admin_schema.sql 을 SQL Editor에서 실행하세요.',
    sqlEditorUrl: 'https://supabase.com/dashboard/project/lyikgkjhkmppvciicxfm/sql/new',
    sqlFileUrl: '/atherium_admin_schema.sql',
  })
}
