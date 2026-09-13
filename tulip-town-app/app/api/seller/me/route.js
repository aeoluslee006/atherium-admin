import { NextResponse } from 'next/server';
import { getUserFromRequest, tryAdminSupabase } from '../../../../lib/apiAuth';
import {
  SHOP_BASIC_PLAN,
  SHOP_BASIC_PRODUCT_LIMIT,
  isValidEin,
} from '../../../../lib/sellerConstants';
import {
  buildLegacyContactText,
  contactChannelsHaveAny,
  normalizeContactChannels,
} from '../../../../lib/sellerContact';

const SPONSOR_SELECTS = [
  'id,business_name,business_address,ein,sos_document_path,city,contact,contact_channels,description,status,plan_tier,product_limit,review_notes,approved_at,trial_ends_at,created_at,listing_type,seller_kind,submitted_by',
  'id,business_name,business_address,ein,sos_document_path,city,contact,description,status,plan_tier,product_limit,review_notes,approved_at,trial_ends_at,created_at,listing_type,seller_kind,submitted_by',
  'id,business_name,business_address,ein,sos_document_path,city,contact,description,status,plan_tier,product_limit,review_notes,approved_at,trial_ends_at,created_at,listing_type,submitted_by',
];

async function getShopSponsor(db, userId) {
  let lastError = null;
  for (const cols of SPONSOR_SELECTS) {
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
    if (!/(seller_kind|contact_channels)/i.test(error.message || '')) throw error;
  }
  throw lastError;
}

async function persistSponsor({ db, existing, row, mode }) {
  const selectSets = [
    'id,business_name,business_address,city,contact,contact_channels,status,plan_tier,product_limit,sos_document_path,seller_kind,created_at',
    'id,business_name,business_address,city,contact,status,plan_tier,product_limit,sos_document_path,seller_kind,created_at',
    'id,business_name,business_address,city,contact,status,plan_tier,product_limit,sos_document_path,created_at',
  ];

  let payload = { ...row };
  const clients = [db, tryAdminSupabase()].filter(Boolean);

  for (const client of clients) {
    for (const cols of selectSets) {
      let result;
      if (mode === 'update') {
        result = await client
          .from('sponsors')
          .update(payload)
          .eq('id', existing.id)
          .select(cols)
          .single();
      } else if (mode === 'upsert-rejected') {
        result = await client
          .from('sponsors')
          .update(payload)
          .eq('id', existing.id)
          .select(cols)
          .single();
      } else {
        result = await client.from('sponsors').insert(payload).select(cols).single();
      }

      if (!result.error) return result.data;

      if (/contact_channels/i.test(result.error.message || '')) {
        const { contact_channels: _drop, ...rest } = payload;
        payload = rest;
        continue;
      }
      if (/seller_kind/i.test(result.error.message || '')) {
        const { seller_kind: _drop, ...rest } = payload;
        payload = rest;
        continue;
      }

      // Non-column errors: try admin client next, else throw.
      if (client === db) break;
      throw result.error;
    }
  }
  throw new Error('판매자 정보 저장에 실패했습니다.');
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
    const sellerKind =
      String(body.seller_kind || body.sellerKind || 'business').trim().toLowerCase() === 'individual'
        ? 'individual'
        : 'business';
    const businessName = String(body.business_name || body.shop_name || '').trim();
    const businessAddress = String(body.business_address || '').trim();
    const ein = String(body.ein || '').trim();
    const sosDocumentPath = String(body.sos_document_path || '').trim();
    const city = String(body.city || 'Holland').trim();
    const phone = String(body.phone || '').trim();
    const description = String(body.description || body.bio || '').trim() || null;
    const contactChannels = normalizeContactChannels({
      ...(body.contact_channels || body.contactChannels || {}),
      phone,
    });
    const contact =
      buildLegacyContactText({ phone, channels: contactChannels }) ||
      String(body.contact || '').trim() ||
      null;

    if (sellerKind === 'individual') {
      if (!businessName) {
        return NextResponse.json({ error: '판매자/상점 이름을 입력해 주세요.' }, { status: 400 });
      }
      if (!phone && !contactChannelsHaveAny(contactChannels) && !contact) {
        return NextResponse.json(
          { error: '전화, 메신저 아이디/QR, 이메일 중 하나 이상 입력해 주세요.' },
          { status: 400 }
        );
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
      contact_channels: contactChannels,
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

    const result = await persistSponsor({
      db,
      existing,
      row,
      mode: existing?.status === 'rejected' ? 'upsert-rejected' : 'insert',
    });

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

export async function PATCH(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const existing = await getShopSponsor(db, user.id);
    if (!existing) {
      return NextResponse.json({ error: '판매자 등록이 없습니다.' }, { status: 404 });
    }

    const body = await request.json();
    const patch = {};

    if ('city' in body) patch.city = String(body.city || '').trim() || null;
    if ('description' in body || 'bio' in body) {
      patch.description = String(body.description || body.bio || '').trim() || null;
    }
    if ('business_name' in body || 'shop_name' in body) {
      const name = String(body.business_name || body.shop_name || '').trim();
      if (!name) return NextResponse.json({ error: '상점 이름을 입력해 주세요.' }, { status: 400 });
      patch.business_name = name;
    }

    if ('phone' in body || 'contact' in body || 'contact_channels' in body || 'contactChannels' in body) {
      const phone =
        'phone' in body
          ? String(body.phone || '').trim()
          : String(existing.contact_channels?.phone || existing.contact || '').trim();
      const contactChannels = normalizeContactChannels({
        ...(body.contact_channels || body.contactChannels || existing.contact_channels || {}),
        phone,
      });
      const legacyFallback = String(body.contact || '').trim();
      const contact =
        buildLegacyContactText({ phone, channels: contactChannels }) || legacyFallback || null;

      if (!phone && !legacyFallback && !contactChannelsHaveAny(contactChannels)) {
        return NextResponse.json(
          { error: '전화, 메신저 아이디/QR, 이메일 중 하나 이상 남겨 주세요.' },
          { status: 400 }
        );
      }

      patch.contact = contact;
      patch.contact_channels = contactChannels;
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 });
    }

    const result = await persistSponsor({
      db,
      existing,
      row: patch,
      mode: 'update',
    });

    return NextResponse.json({ seller: result, sponsor: result });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
