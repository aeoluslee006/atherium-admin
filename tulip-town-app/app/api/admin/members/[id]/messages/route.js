import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../../../lib/adminAuth';
import { createAdminSupabase } from '../../../../../../lib/supabaseAdmin';

/** List messages from a member to admin. */
export async function GET(request, { params }) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from('admin_messages')
      .select('id,profile_id,message,is_read,created_at')
      .eq('profile_id', id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ messages: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/** Mark all messages from member as read. */
export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from('admin_messages')
      .update({ is_read: true })
      .eq('profile_id', id)
      .eq('is_read', false);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
