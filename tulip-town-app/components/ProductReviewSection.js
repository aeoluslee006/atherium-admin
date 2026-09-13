'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const COMMENT_MAX = 120;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session?.access_token || ''}`,
  };
}

function formatReviewDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Light "거래 좋아요" reviews for sold products.
 * No star ratings — thumbs-up + optional one-line comment.
 */
export default function ProductReviewSection({
  productId,
  isSold = false,
  initialReviews = [],
  initialMyReview = null,
  sellerUserId = null,
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [myReview, setMyReview] = useState(initialMyReview);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(
    async (event) => {
      event.preventDefault();
      if (busy || !productId || myReview) return;

      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        const next = typeof window !== 'undefined' ? window.location.pathname : '/shop';
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      if (sellerUserId && data.session.user.id === sellerUserId) {
        setError('본인 상품에는 후기를 남길 수 없습니다.');
        return;
      }

      setBusy(true);
      setError('');
      try {
        const res = await fetch('/api/shop/reviews', {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ product_id: productId, comment }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || '후기 등록 실패');
        const item = payload.item;
        setMyReview(item);
        setReviews((prev) => [item, ...prev.filter((r) => r.id !== item.id)]);
        setComment('');
      } catch (err) {
        setError(err.message || '후기 등록 실패');
      } finally {
        setBusy(false);
      }
    },
    [busy, comment, myReview, productId, router, sellerUserId]
  );

  return (
    <section className="shop-reviews" aria-labelledby="shop-reviews-title">
      <div className="shop-reviews-head">
        <h2 id="shop-reviews-title">거래 후기</h2>
        <span className="shop-reviews-count">👍 {reviews.length}</span>
      </div>

      {!isSold ? (
        <p className="shop-reviews-hint">판매완료된 상품에만 가벼운 거래 후기를 남길 수 있어요.</p>
      ) : myReview ? (
        <p className="shop-reviews-hint">이 상품에 거래 좋아요를 남겼습니다. 감사합니다!</p>
      ) : (
        <form className="shop-review-form" onSubmit={submit}>
          <button type="submit" className="btn shop-review-like-btn" disabled={busy}>
            👍 거래 좋아요
          </button>
          <label className="shop-review-comment-field">
            <span className="shop-review-comment-label">한 줄 후기 (선택)</span>
            <input
              type="text"
              value={comment}
              maxLength={COMMENT_MAX}
              placeholder="따뜻했던 거래 한마디"
              onChange={(e) => setComment(e.target.value)}
              disabled={busy}
            />
          </label>
          {error ? <p className="shop-review-error">{error}</p> : null}
        </form>
      )}

      {reviews.length ? (
        <ul className="shop-review-list">
          {reviews.map((review) => (
            <li key={review.id} className="shop-review-item">
              <div className="shop-review-item-top">
                <span className="shop-review-like" aria-hidden="true">
                  👍
                </span>
                <strong className="shop-review-name">{review.reviewerName || '회원'}</strong>
                <time className="shop-review-date" dateTime={review.createdAt || undefined}>
                  {formatReviewDate(review.createdAt)}
                </time>
              </div>
              {review.comment ? <p className="shop-review-comment">{review.comment}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="shop-reviews-empty">아직 거래 후기가 없습니다.</p>
      )}
    </section>
  );
}
