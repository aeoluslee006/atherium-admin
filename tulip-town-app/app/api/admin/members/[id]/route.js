import { NextResponse } from 'next/server';
import { requireAdminFromRequest } from '../../../../../lib/adminAuth';
import { applyMemberStatusChange } from '../../../../../lib/adminMemberActions';
import { MEMBER_STATUS } from '../../../../../lib/memberStatus';
import { createAdminSupabase } from '../../../../../lib/supabaseAdmin';

export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (id === admin.user.id) {
      return NextResponse.json({ error: '본인 관리자 계정은 변경할 수 없습니다.' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = createAdminSupabase();

    // Reject legacy write fields — status is sole source of truth
    if ('is_banned' in body || 'suspended_until' in body || 'banned_reason' in body) {
      return NextResponse.json(
        {
          error:
            'is_banned/suspended_until은 읽기 전용입니다. status(active|hold|deleted) 또는 product_key+promo_end_date를 사용하세요.',
        },
        { status: 400 }
      );
    }

    let nextStatus;
    if ('status' in body) {
      nextStatus = String(body.status || '').toLowerCase();
      if (!Object.values(MEMBER_STATUS).includes(nextStatus)) {
        return NextResponse.json({ error: 'status must be active|hold|deleted' }, { status: 400 });
      }
    }

    let promoEndDate;
    if ('promo_end_date' in body) {
      promoEndDate = body.promo_end_date ? String(body.promo_end_date).slice(0, 10) : null;
    }
    const productKey = body.product_key ? String(body.product_key) : undefined;

    if (nextStatus === undefined && promoEndDate === undefined) {
      return NextResponse.json(
        { error: 'status 또는 promo_end_date(+product_key)가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await applyMemberStatusChange(supabase, {
      actorId: admin.user.id,
      targetId: id,
      nextStatus,
      promoEndDate,
      productKey,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
