import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../lib/adminAuth';
import { createAdminSupabase } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    const supabase = createAdminSupabase();
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, display_name, is_admin, is_banned, banned_reason, suspended_until, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (authErr) throw authErr;
    const emailById = new Map((authData?.users || []).map((u) => [u.id, u.email || '']));

    let members = (profiles || []).map((p) => ({
      ...p,
      email: emailById.get(p.id) || '',
    }));

    if (q) {
      members = members.filter(
        (m) =>
          (m.email || '').toLowerCase().includes(q) ||
          (m.display_name || '').toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ members });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
