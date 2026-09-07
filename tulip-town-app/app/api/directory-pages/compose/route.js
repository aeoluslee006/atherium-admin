import { NextResponse } from 'next/server';
import { requireAdminOrModeratorFromRequest } from '../../../../lib/adminAuth';
import { tryAdminSupabase } from '../../../../lib/apiAuth';
import { buildComposedPageSlots, groupSlotsByPage } from '../../../../lib/directorySlots';

export async function GET(request) {
  try {
    const auth = await requireAdminOrModeratorFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = tryAdminSupabase();
    if (!db) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' }, { status: 500 });
    }

    const { data: slots, error } = await db
      .from('directory_slots')
      .select(
        'id,page_number,row_index,col_index,span_cols,span_rows,position_label,size_tier,base_price_cents,status'
      )
      .order('page_number', { ascending: true })
      .order('row_index', { ascending: true })
      .order('col_index', { ascending: true });
    if (error) throw error;

    return NextResponse.json({
      slots: slots || [],
      pages: groupSlotsByPage(slots || []),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdminOrModeratorFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = tryAdminSupabase();
    if (!db) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' }, { status: 500 });
    }

    const body = await request.json();
    const action = body.action || 'create_composed_page';

    if (action === 'create_composed_page') {
      const { data: maxRows, error: maxErr } = await db
        .from('directory_slots')
        .select('page_number')
        .order('page_number', { ascending: false })
        .limit(1);
      if (maxErr) throw maxErr;
      const maxRow = Array.isArray(maxRows) && maxRows.length ? maxRows[0] : null;
      const nextPage = Number(body.page_number) || (Number(maxRow?.page_number) || 0) + 1;
      if (!Number.isFinite(nextPage) || nextPage < 1) {
        return NextResponse.json({ error: 'Invalid page_number' }, { status: 400 });
      }

      let rows;
      try {
        rows = buildComposedPageSlots(nextPage, body.placements || []);
      } catch (err) {
        return NextResponse.json({ error: err.message || '배치가 올바르지 않습니다.' }, { status: 400 });
      }

      const { data, error } = await db.from('directory_slots').insert(rows).select('*');
      if (error) throw error;

      return NextResponse.json({
        ok: true,
        page_number: nextPage,
        slots: data || [],
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
