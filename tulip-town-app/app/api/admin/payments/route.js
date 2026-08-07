import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../lib/adminAuth';
import { createAdminSupabase } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from('payments')
      .select('*, sponsors(business_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const payments = (data || []).map((p) => ({
      ...p,
      sponsor_name: p.sponsors?.business_name || null,
      sponsors: undefined,
    }));

    return NextResponse.json({ payments });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
