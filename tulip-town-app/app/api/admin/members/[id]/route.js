import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../../lib/adminAuth';
import { createAdminSupabase } from '../../../../../lib/supabaseAdmin';

export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (id === admin.user.id) {
      return NextResponse.json({ error: '본인 관리자 계정은 변경할 수 없습니다.' }, { status: 400 });
    }

    const body = await request.json();
    const patch = {};
    if ('is_banned' in body) patch.is_banned = !!body.is_banned;
    if ('banned_reason' in body) patch.banned_reason = body.banned_reason;
    if ('suspended_until' in body) patch.suspended_until = body.suspended_until;

    const supabase = createAdminSupabase();
    const { data: target } = await supabase.from('profiles').select('is_admin').eq('id', id).maybeSingle();
    if (target?.is_admin) {
      return NextResponse.json({ error: '다른 관리자 계정은 변경할 수 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ member: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
