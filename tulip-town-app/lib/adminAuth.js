import { createServerSupabase } from './supabaseServer';
import { createAdminSupabase } from './supabaseAdmin';

export async function getSessionUser() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

export async function getProfile(userId) {
  const admin = createAdminSupabase();
  const { data, error } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Verify request bearer/session is an admin. Returns { user, profile } or null. */
export async function requireAdminFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY';

  const { createClient } = await import('@supabase/supabase-js');
  const userClient = createClient(supabaseUrl, anon, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let user = null;
  if (token) {
    const { data } = await userClient.auth.getUser(token);
    user = data.user;
  } else {
    const server = createServerSupabase();
    const { data } = await server.auth.getUser();
    user = data.user;
  }

  if (!user) return null;
  const profile = await getProfile(user.id);
  if (!profile?.is_admin) return null;
  return { user, profile };
}

export function isWriteBlocked(profile) {
  if (!profile) return { blocked: true, reason: '프로필을 찾을 수 없습니다.' };
  if (profile.is_banned) {
    return {
      blocked: true,
      reason: profile.banned_reason
        ? `계정이 이용 정지되었습니다: ${profile.banned_reason}`
        : '계정이 이용 정지되어 글쓰기/댓글이 제한됩니다.',
    };
  }
  if (profile.suspended_until) {
    const until = new Date(profile.suspended_until);
    if (until.getTime() > Date.now()) {
      return {
        blocked: true,
        reason: `계정이 ${until.toLocaleString('ko-KR')}까지 일시 정지되었습니다.`,
      };
    }
  }
  return { blocked: false, reason: '' };
}
