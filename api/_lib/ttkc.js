import { createClient } from '@supabase/supabase-js'

const TTKC_URL =
  process.env.TTKC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co'
const TTKC_ANON =
  process.env.TTKC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY'
const BRIDGE_SECRET =
  process.env.ATHERIUM_TTKC_SECRET || 'ttkc_ath_e9127d3e5003296d83a74efa2e7c83df03bd371e45bfa3f8'

export function getBridgeSecret() {
  return BRIDGE_SECRET
}

export function ttkcClient() {
  return createClient(TTKC_URL, TTKC_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireAtheriumUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !anon) return null

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

export function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

export function isSchemaMissing(error) {
  const msg = (error?.message || '').toLowerCase()
  return (
    msg.includes('could not find the function') ||
    msg.includes('atherium_ttkc') ||
    msg.includes('site_visits') ||
    msg.includes('points_purchased') ||
    msg.includes('schema cache')
  )
}
