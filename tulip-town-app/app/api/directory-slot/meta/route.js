import { NextResponse } from 'next/server';
import { supabaseRest } from '../../../../lib/supabaseRest';

/** Public slot meta for apply/edit forms (avoids client getSession hang). */
export async function GET(request) {
  try {
    const slotId = request.nextUrl.searchParams.get('id') || '';
    if (!slotId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    const rows = await supabaseRest(
      `directory_slots?id=eq.${encodeURIComponent(slotId)}&select=id,page_number,row_index,col_index,span_cols,span_rows,position_label,size_tier,base_price_cents,status`
    );
    const slot = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!slot) {
      return NextResponse.json({ error: '슬롯을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ slot });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
