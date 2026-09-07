import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../lib/adminAuth';
import { tryAdminSupabase } from '../../../../lib/apiAuth';
import { buildDefaultPageSlots } from '../../../../lib/directorySlots';
import { getStripe } from '../../../../lib/stripe';

export async function GET(request) {
  try {
    const adminUser = await requireAdminFromRequest(request);
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = tryAdminSupabase();
    if (!db) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' }, { status: 500 });
    }

    const { data: slots, error } = await db
      .from('directory_slots')
      .select(
        '*,directory_slot_ads(id,slot_id,ad_title,category_slug,ad_phone,ad_image_url,status,stripe_subscription_id,period_end,submitted_by,created_at)'
      )
      .order('page_number', { ascending: true })
      .order('row_index', { ascending: true })
      .order('col_index', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ slots: slots || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminUser = await requireAdminFromRequest(request);
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = tryAdminSupabase();
    if (!db) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY가 필요합니다.' }, { status: 500 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'add_page') {
      const { data: maxRow } = await db
        .from('directory_slots')
        .select('page_number')
        .order('page_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPage = Number(body.page_number) || (Number(maxRow?.page_number) || 0) + 1;
      const rows = buildDefaultPageSlots(nextPage);
      const { data, error } = await db.from('directory_slots').insert(rows).select('*');
      if (error) throw error;
      return NextResponse.json({ page_number: nextPage, slots: data || [] });
    }

    // Insert large-block page like 1면 at page 3; shift existing >=3 up by 1.
    if (action === 'insert_large_page3') {
      const { data: page3, error: p3Err } = await db
        .from('directory_slots')
        .select('id,size_tier')
        .eq('page_number', 3);
      if (p3Err) throw p3Err;
      const list = page3 || [];
      if (list.length === 3 && list.every((s) => s.size_tier === 'large')) {
        return NextResponse.json({ ok: true, already: true, page_number: 3 });
      }

      const { data: toShift, error: shiftErr } = await db
        .from('directory_slots')
        .select('id,page_number')
        .gte('page_number', 3)
        .order('page_number', { ascending: false });
      if (shiftErr) throw shiftErr;

      const byPage = new Map();
      for (const row of toShift || []) {
        const p = Number(row.page_number);
        if (!byPage.has(p)) byPage.set(p, []);
        byPage.get(p).push(row.id);
      }
      const pagesDesc = [...byPage.keys()].sort((a, b) => b - a);
      for (const p of pagesDesc) {
        const ids = byPage.get(p);
        const { error: upErr } = await db
          .from('directory_slots')
          .update({ page_number: p + 1 })
          .in('id', ids);
        if (upErr) throw upErr;
      }

      const { data: page1Large } = await db
        .from('directory_slots')
        .select('position_label,base_price_cents,row_index,col_index,span_cols,span_rows,size_tier')
        .eq('page_number', 1)
        .eq('size_tier', 'large')
        .order('row_index', { ascending: true })
        .order('col_index', { ascending: true });

      let rows;
      if (page1Large?.length) {
        rows = page1Large.map((s) => ({
          page_number: 3,
          row_index: s.row_index,
          col_index: s.col_index,
          span_cols: s.span_cols,
          span_rows: s.span_rows,
          position_label: s.position_label,
          size_tier: s.size_tier,
          base_price_cents: s.base_price_cents,
          status: 'available',
        }));
      } else {
        rows = buildDefaultPageSlots(3);
      }

      const { data, error } = await db.from('directory_slots').insert(rows).select('*');
      if (error) throw error;
      return NextResponse.json({ ok: true, page_number: 3, slots: data || [] });
    }

    if (action === 'update_price') {
      const id = body.slot_id || body.id;
      const cents = Math.round(Number(body.base_price_cents));
      if (!id || !Number.isFinite(cents) || cents < 0) {
        return NextResponse.json({ error: 'slot_id and base_price_cents required' }, { status: 400 });
      }
      const { data, error } = await db
        .from('directory_slots')
        .update({ base_price_cents: cents })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ slot: data });
    }

    if (action === 'force_remove_ad') {
      const adId = body.ad_id;
      if (!adId) return NextResponse.json({ error: 'ad_id required' }, { status: 400 });

      const { data: ad, error: adErr } = await db
        .from('directory_slot_ads')
        .select('*')
        .eq('id', adId)
        .maybeSingle();
      if (adErr) throw adErr;
      if (!ad) return NextResponse.json({ error: '광고를 찾을 수 없습니다.' }, { status: 404 });

      if (ad.stripe_subscription_id) {
        try {
          const stripe = getStripe();
          await stripe.subscriptions.cancel(ad.stripe_subscription_id);
        } catch (err) {
          console.warn('stripe cancel warning', err.message);
        }
      }

      const { error: expErr } = await db
        .from('directory_slot_ads')
        .update({ status: 'expired' })
        .eq('id', adId);
      if (expErr) throw expErr;

      const { error: slotErr } = await db
        .from('directory_slots')
        .update({ status: 'available' })
        .eq('id', ad.slot_id);
      if (slotErr) throw slotErr;

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
