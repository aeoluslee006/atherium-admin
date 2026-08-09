import { supabase } from './supabase'

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Atherium 로그인이 필요합니다.')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function parse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`)
  return data
}

export async function fetchTtkcOverview() {
  const headers = await authHeaders()
  const res = await fetch('/api/ttkc/overview', { headers })
  return parse(res)
}

export async function fetchTtkcMembers(q = '') {
  const headers = await authHeaders()
  const res = await fetch(`/api/ttkc/members?q=${encodeURIComponent(q)}`, { headers })
  return parse(res)
}

export async function moderateTtkcMember(id, body) {
  const headers = await authHeaders()
  const res = await fetch(`/api/ttkc/members/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  return parse(res)
}
