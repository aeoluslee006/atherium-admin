import { NextResponse } from 'next/server';
import { getUserFromRequest, getWriteDbFromRequest, tryAdminSupabase } from '../../../lib/apiAuth';
import { isLoginBlocked } from '../../../lib/memberStatus';

/** Member submits a message to admin. */
export async function POST(request) {
  try {
    let { user, db } = await getUserFromRequest(request);
    if (!user || !db) {
      const fallback = await getWriteDbFromRequest(request);
      if (fallback.user && fallback.db) {
        user = fallback.user;
        db = fallback.db;
      }
    }
    if (!user || !db) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const adminDb = tryAdminSupabase();
    const reader = adminDb || db;
    const { data: profile } = await reader
      .from('profiles')
      .select('id,status,is_banned')
      .eq('id', user.id)
      .maybeSingle();
    if (profile && isLoginBlocked(profile)) {
      return NextResponse.json({ error: '삭제된 계정입니다.' }, { status: 403 });
    }

    const body = await request.json();
    const message = String(body.message || '').trim();
    if (!message) {
      return NextResponse.json({ error: '메시지 내용을 입력해 주세요.' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: '메시지는 2000자 이내로 작성해 주세요.' }, { status: 400 });
    }

    const writer = adminDb || db;
    const { data, error } = await writer
      .from('admin_messages')
      .insert({
        profile_id: user.id,
        message,
        is_read: false,
      })
      .select('id,created_at')
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, message: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
