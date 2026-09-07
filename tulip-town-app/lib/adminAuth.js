import { createServerSupabase } from './supabaseServer';
import { getBearerToken, tryAdminSupabase, userClientFromToken } from './apiAuth';

export async function getSessionUser() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

/** Load profile; service role preferred, else caller-provided db. */
export async function getProfile(userId, db = null) {
  const client = db || tryAdminSupabase();
  if (!client) {
    throw new Error('프로필을 읽을 DB 클라이언트가 없습니다.');
  }
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Verify request bearer/session is an admin. Returns { user, profile, db } or null. */
export async function requireAdminFromRequest(request) {
  const auth = await resolveUserProfileFromRequest(request);
  if (!auth?.profile?.is_admin) return null;
  return auth;
}

/** Admin or black-level moderator. */
export async function requireAdminOrModeratorFromRequest(request) {
  const auth = await resolveUserProfileFromRequest(request);
  if (!auth?.profile) return null;
  if (!auth.profile.is_admin && !auth.profile.is_moderator) return null;
  return auth;
}

async function resolveUserProfileFromRequest(request) {
  const token = getBearerToken(request);

  let user = null;
  let db = null;

  if (token) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
    const anon =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY';
    const probe = createClient(supabaseUrl, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await probe.auth.getUser(token);
    if (error) console.warn('auth.getUser failed', error.message);
    user = data?.user || null;
    if (user) db = userClientFromToken(token);
  }

  if (!user) {
    try {
      const server = createServerSupabase();
      const { data } = await server.auth.getUser();
      user = data.user || null;
      if (user) db = server;
    } catch (err) {
      console.warn('cookie auth failed', err?.message || err);
    }
  }

  if (!user) return null;

  const admin = tryAdminSupabase();
  const profile = await getProfile(user.id, admin || db);
  return { user, profile, db: admin || db };
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
