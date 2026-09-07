import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from './supabaseServer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY';

export function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export function userClientFromToken(token) {
  if (!token) return null;
  return createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUserFromRequest(request) {
  const token = getBearerToken(request);
  if (!token) return { user: null, token: null, db: null };
  const client = createClient(supabaseUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.auth.getUser(token);
  const user = data.user || null;
  if (!user) return { user: null, token, db: null };
  const db = userClientFromToken(token);
  return { user, token, db };
}

/**
 * Prefer service-role DB; otherwise authenticated user DB (bearer or cookies).
 * Used so moderator compose works even when SUPABASE_SERVICE_ROLE_KEY is unset.
 */
export async function getWriteDbFromRequest(request) {
  const admin = tryAdminSupabase();
  if (admin) return { db: admin, mode: 'service', user: null };

  const fromBearer = await getUserFromRequest(request);
  if (fromBearer.user && fromBearer.db) {
    return { db: fromBearer.db, mode: 'bearer', user: fromBearer.user };
  }

  try {
    const server = createServerSupabase();
    const { data } = await server.auth.getUser();
    if (data.user) {
      return { db: server, mode: 'cookie', user: data.user };
    }
  } catch (err) {
    console.warn('cookie db failed', err?.message || err);
  }

  return { db: null, mode: 'none', user: null };
}

export function tryAdminSupabase() {
  try {
    // eslint-disable-next-line global-require
    const { createAdminSupabase } = require('./supabaseAdmin');
    return createAdminSupabase();
  } catch {
    return null;
  }
}

export { supabaseUrl, anon as supabaseAnonKey };
