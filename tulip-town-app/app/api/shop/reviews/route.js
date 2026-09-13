import { NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/apiAuth';
import {
  COMMENT_MAX,
  loadProductReviews,
  normalizeReviewComment,
} from '../../../../lib/shopReviews';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = String(searchParams.get('product_id') || '').trim();
    if (!productId) {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 });
    }
    const items = await loadProductReviews(productId);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, db } = await getUserFromRequest(request);
    if (!user || !db) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const productId = String(body.product_id || '').trim();
    const comment = normalizeReviewComment(body.comment);
    if (!productId) {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 });
    }
    if (comment && comment.length > COMMENT_MAX) {
      return NextResponse.json(
        { error: `후기는 ${COMMENT_MAX}자 이내로 작성해 주세요.` },
        { status: 400 }
      );
    }

    const productSelects = [
      'id,is_active,sponsor_id,sponsors(id,submitted_by,listing_type,status)',
      'id,is_active,sponsor_id,sponsors(id,submitted_by,status)',
      'id,is_active,sponsor_id',
    ];
    let product = null;
    let productError = null;
    for (const select of productSelects) {
      const result = await db.from('products').select(select).eq('id', productId).maybeSingle();
      if (!result.error) {
        product = result.data;
        productError = null;
        break;
      }
      productError = result.error;
    }
    if (productError) throw productError;
    if (!product?.id) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (product.is_active !== false) {
      return NextResponse.json(
        { error: '판매완료된 상품에만 후기를 남길 수 있습니다.' },
        { status: 400 }
      );
    }

    const seller = product.sponsors || null;
    if (seller?.submitted_by && seller.submitted_by === user.id) {
      return NextResponse.json(
        { error: '본인 상품에는 후기를 남길 수 없습니다.' },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await db
      .from('product_reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('reviewer_id', user.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.id) {
      return NextResponse.json({ error: '이미 이 상품에 후기를 남겼습니다.' }, { status: 409 });
    }

    const { data: inserted, error: insertError } = await db
      .from('product_reviews')
      .insert({
        product_id: productId,
        reviewer_id: user.id,
        comment,
      })
      .select('id,product_id,reviewer_id,comment,created_at')
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({
      ok: true,
      item: {
        id: inserted.id,
        productId: inserted.product_id,
        reviewerId: inserted.reviewer_id,
        comment: inserted.comment || null,
        createdAt: inserted.created_at,
        reviewerName: '나',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
