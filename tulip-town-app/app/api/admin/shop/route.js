import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../lib/adminAuth';
import { tryAdminSupabase } from '../../../../lib/apiAuth';

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function GET(request) {
  try {
    const adminUser = await requireAdminFromRequest(request);
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = tryAdminSupabase();
    if (!db) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let q = db
      .from('sponsors')
      .select('*')
      .eq('listing_type', 'shop')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ listings: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const adminUser = await requireAdminFromRequest(request);
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = tryAdminSupabase();
    if (!db) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' }, { status: 500 });
    }

    const body = await request.json();
    const id = body.id;
    const status = body.status;
    if (!id || !['approved', 'pending', 'rejected', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status required' }, { status: 400 });
    }

    const now = new Date();
    const patch = {
      status,
      updated_at: now.toISOString(),
    };

    if (status === 'approved') {
      patch.approved_at = now.toISOString();
      // First 3 months free from approval date
      patch.trial_ends_at = addMonths(now, 3).toISOString();
    }

    const { data, error } = await db
      .from('sponsors')
      .update(patch)
      .eq('id', id)
      .eq('listing_type', 'shop')
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ listing: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
