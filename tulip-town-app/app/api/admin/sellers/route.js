import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../lib/adminAuth';
import { tryAdminSupabase } from '../../../../lib/apiAuth';

export async function GET(request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = tryAdminSupabase();
    if (!db) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' },
        { status: 500 }
      );
    }

    const { data, error } = await db
      .from('gift_sellers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ sellers: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = tryAdminSupabase();
    if (!db) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const id = body.id;
    const status = body.status;
    if (!id || !['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status required' }, { status: 400 });
    }

    const patch = {
      status,
      reviewed_by: admin.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rejection_reason: status === 'rejected' ? String(body.rejection_reason || '').trim() || null : null,
    };

    const { data, error } = await db
      .from('gift_sellers')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ seller: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
