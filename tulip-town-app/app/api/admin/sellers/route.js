import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../lib/adminAuth';
import { tryAdminSupabase } from '../../../../lib/apiAuth';
import {
  SHOP_BASIC_PLAN,
  SHOP_BASIC_PRODUCT_LIMIT,
} from '../../../../lib/sellerConstants';

const SOS_BUCKET = 'seller-documents';

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

    const { searchParams } = new URL(request.url);
    const docFor = searchParams.get('doc');
    if (docFor) {
      const { data: row, error } = await db
        .from('sponsors')
        .select('id,sos_document_path,listing_type')
        .eq('id', docFor)
        .eq('listing_type', 'shop')
        .maybeSingle();
      if (error) throw error;
      if (!row?.sos_document_path) {
        return NextResponse.json({ error: '서류가 없습니다.' }, { status: 404 });
      }
      const { data: signed, error: signErr } = await db.storage
        .from(SOS_BUCKET)
        .createSignedUrl(row.sos_document_path, 60 * 5);
      if (signErr) throw signErr;
      return NextResponse.json({ url: signed?.signedUrl || null, expiresIn: 300 });
    }

    const { data, error } = await db
      .from('sponsors')
      .select(
        'id,business_name,business_address,ein,sos_document_path,city,description,status,plan_tier,product_limit,review_notes,approved_at,created_at,submitted_by,listing_type'
      )
      .eq('listing_type', 'shop')
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
    if (!id || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status required' }, { status: 400 });
    }

    const patch = {
      status,
      review_notes:
        status === 'rejected' ? String(body.review_notes || body.rejection_reason || '').trim() || null : null,
    };
    if (status === 'approved') {
      patch.approved_at = new Date().toISOString();
      // Keep defaults if already set
      if (!body.keep_plan) {
        patch.plan_tier = SHOP_BASIC_PLAN;
        patch.product_limit = SHOP_BASIC_PRODUCT_LIMIT;
      }
    }
    if (status === 'rejected' || status === 'pending') {
      patch.approved_at = null;
    }

    const { data, error } = await db
      .from('sponsors')
      .update(patch)
      .eq('id', id)
      .eq('listing_type', 'shop')
      .select(
        'id,business_name,business_address,ein,sos_document_path,city,description,status,plan_tier,product_limit,review_notes,approved_at,created_at,submitted_by,listing_type'
      )
      .single();
    if (error) throw error;
    return NextResponse.json({ seller: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
