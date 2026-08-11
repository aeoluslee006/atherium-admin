import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import {
  SHOP_BASIC_PLAN,
  SHOP_BASIC_PRODUCT_LIMIT,
  isValidEin,
} from '../../../../lib/sellerConstants';

async function getShopSponsor(db, userId) {
  const { data, error } = await db
    .from('sponsors')
    .select(
      'id,business_name,business_address,ein,sos_document_path,city,description,status,plan_tier,product_limit,review_notes,approved_at,created_at,listing_type,submitted_by'
    )
    .eq('listing_type', 'shop')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const sponsor = await getShopSponsor(db, user.id);
    return NextResponse.json({ seller: sponsor || null, sponsor: sponsor || null });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const body = await request.json();
    const businessName = String(body.business_name || '').trim();
    const businessAddress = String(body.business_address || '').trim();
    const ein = String(body.ein || '').trim();
    const sosDocumentPath = String(body.sos_document_path || '').trim();
    const city = String(body.city || 'Holland').trim();
    const description = String(body.description || body.bio || '').trim() || null;

    if (!businessName || !businessAddress || !ein || !sosDocumentPath) {
      return NextResponse.json(
        { error: '사업자명, 주소, EIN, Secretary of State 서류는 모두 필수입니다.' },
        { status: 400 }
      );
    }
    if (!isValidEin(ein)) {
      return NextResponse.json(
        { error: 'EIN 형식이 올바르지 않습니다. 예: 12-3456789' },
        { status: 400 }
      );
    }
    if (!sosDocumentPath.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { error: '서류 경로가 올바르지 않습니다. 다시 업로드해 주세요.' },
        { status: 400 }
      );
    }

    const existing = await getShopSponsor(db, user.id);
    if (existing && existing.status !== 'rejected') {
      return NextResponse.json(
        { error: '이미 입점 신청이 있습니다. 관리자 검토를 기다려 주세요.' },
        { status: 400 }
      );
    }

    const row = {
      business_name: businessName,
      business_address: businessAddress,
      ein,
      sos_document_path: sosDocumentPath,
      city,
      description,
      listing_type: 'shop',
      status: 'pending',
      submitted_by: user.id,
      plan_tier: SHOP_BASIC_PLAN,
      product_limit: SHOP_BASIC_PRODUCT_LIMIT,
      review_notes: null,
      approved_at: null,
    };

    // Prefer user-scoped client; fall back to service role if RLS blocks insert.
    let result;
    let writeDb = db;
    if (existing?.status === 'rejected') {
      const { data, error } = await writeDb
        .from('sponsors')
        .update(row)
        .eq('id', existing.id)
        .select(
          'id,business_name,business_address,city,status,plan_tier,product_limit,sos_document_path,created_at'
        )
        .single();
      if (error) {
        const admin = tryAdminSupabase();
        if (!admin) throw error;
        const retry = await admin
          .from('sponsors')
          .update(row)
          .eq('id', existing.id)
          .select(
            'id,business_name,business_address,city,status,plan_tier,product_limit,sos_document_path,created_at'
          )
          .single();
        if (retry.error) throw retry.error;
        result = retry.data;
      } else {
        result = data;
      }
    } else {
      const { data, error } = await writeDb
        .from('sponsors')
        .insert(row)
        .select(
          'id,business_name,business_address,city,status,plan_tier,product_limit,sos_document_path,created_at'
        )
        .single();
      if (error) {
        const admin = tryAdminSupabase();
        if (!admin) throw error;
        const retry = await admin
          .from('sponsors')
          .insert(row)
          .select(
            'id,business_name,business_address,city,status,plan_tier,product_limit,sos_document_path,created_at'
          )
          .single();
        if (retry.error) throw retry.error;
        result = retry.data;
      } else {
        result = data;
      }
    }

    // Never echo sensitive fields beyond what's needed for confirmation UI.
    return NextResponse.json({
      seller: result,
      sponsor: result,
      message: '관리자 검토 중입니다. 승인되면 안내드립니다.',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
