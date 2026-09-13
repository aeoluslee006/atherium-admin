import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import {
  SHOP_BASIC_PLAN,
  SHOP_BASIC_PRODUCT_LIMIT,
  isValidEin,
} from '../../../../lib/sellerConstants';

async function getShopSponsor(db, userId) {
  const selects = [
    'id,business_name,business_address,ein,sos_document_path,city,contact,description,status,plan_tier,product_limit,review_notes,approved_at,trial_ends_at,created_at,listing_type,seller_kind,submitted_by',
    'id,business_name,business_address,ein,sos_document_path,city,contact,description,status,plan_tier,product_limit,review_notes,approved_at,trial_ends_at,created_at,listing_type,submitted_by',
  ];
  let lastError = null;
  for (const cols of selects) {
    const { data, error } = await db
      .from('sponsors')
      .select(cols)
      .eq('listing_type', 'shop')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error) return data;
    lastError = error;
    if (!/seller_kind/i.test(error.message || '')) throw error;
  }
  throw lastError;
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
    const sellerKind = String(body.seller_kind || body.sellerKind || 'business').trim().toLowerCase() === 'individual'
      ? 'individual'
      : 'business';
    const businessName = String(body.business_name || body.shop_name || '').trim();
    const businessAddress = String(body.business_address || '').trim();
    const ein = String(body.ein || '').trim();
    const sosDocumentPath = String(body.sos_document_path || '').trim();
    const city = String(body.city || 'Holland').trim();
    const contact = String(body.contact || '').trim() || null;
    const description = String(body.description || body.bio || '').trim() || null;

    if (sellerKind === 'individual') {
      if (!businessName) {
        return NextResponse.json({ error: '판매자/상점 이름을 입력해 주세요.' }, { status: 400 });
      }
      if (!contact) {
        return NextResponse.json({ error: '연락처를 입력해 주세요.' }, { status: 400 });
      }
    } else {
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
    }

    const existing = await getShopSponsor(db, user.id);
    if (existing && existing.status !== 'rejected') {
      return NextResponse.json(
        { error: '이미 판매자 등록/입점 신청이 있습니다.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const row = {
      business_name: businessName,
      business_address: businessAddress || null,
      ein: sellerKind === 'individual' ? null : ein,
      sos_document_path: sellerKind === 'individual' ? null : sosDocumentPath,
      city,
      contact,
      description,
      listing_type: 'shop',
      seller_kind: sellerKind,
      status: sellerKind === 'individual' ? 'approved' : 'pending',
      submitted_by: user.id,
      plan_tier: SHOP_BASIC_PLAN,
      product_limit: SHOP_BASIC_PRODUCT_LIMIT,
      review_notes: null,
      approved_at: sellerKind === 'individual' ? nowIso : null,
    };

    const rowWithoutKind = (({ seller_kind: _ignored, ...rest }) => rest)(row);

    // Prefer user-scoped client; fall back to service role if RLS blocks insert.
    let result;
    let writeDb = db;
    if (existing?.status === 'rejected') {
      const { data, error } = await writeDb
        .from('sponsors')
        .update(row)
        .eq('id', existing.id)
        .select(
          'id,business_name,business_address,city,status,plan_tier,product_limit,sos_document_path,seller_kind,created_at'
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
            'id,business_name,business_address,city,status,plan_tier,product_limit,sos_document_path,seller_kind,created_at'
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
          'id,business_name,business_address,city,status,plan_tier,product_limit,sos_document_path,seller_kind,created_at'
        )
        .single();
      if (error) {
        const admin = tryAdminSupabase();
        if (!admin) throw error;
        const retry = await admin
          .from('sponsors')
          .insert(row)
          .select(
            'id,business_name,business_address,city,status,plan_tier,product_limit,sos_document_path,seller_kind,created_at'
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
      message:
        sellerKind === 'individual'
          ? '개인 판매자로 등록되었습니다. 바로 상품을 올릴 수 있습니다.'
          : '관리자 검토 중입니다. 승인되면 안내드립니다.',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
