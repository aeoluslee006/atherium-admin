import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../lib/adminAuth';
import { createAdminSupabase } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminSupabase();
    const { data, error } = await supabase.from('pricing_settings').select('*').order('key');
    if (error) throw error;
    return NextResponse.json({ settings: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    const patch = {
      updated_by: admin.user.id,
      updated_at: new Date().toISOString(),
    };
    if ('amount_cents' in body) patch.amount_cents = Number(body.amount_cents);
    if ('is_active' in body) patch.is_active = !!body.is_active;
    if ('label' in body) patch.label = body.label;

    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from('pricing_settings')
      .update(patch)
      .eq('key', body.key)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ setting: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
