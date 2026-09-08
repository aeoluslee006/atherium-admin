'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import {
  SELLER_STATUS_LABEL,
  canManageShopProducts,
  formatPriceCents,
  shopProductLimit,
} from '../../../lib/sellerConstants';

function MyPageShopInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [sponsor, setSponsor] = useState(null);
  const [products, setProducts] = useState([]);
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');

  const authHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const load = useCallback(async (accessToken) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const meRes = await fetch('/api/seller/me', { headers });
    const me = await meRes.json();
    if (!meRes.ok) throw new Error(me.error || '불러오기 실패');
    const s = me.sponsor || me.seller;
    setSponsor(s);

    if (s && s.status === 'approved') {
      const pRes = await fetch('/api/seller/products', { headers });
      const pData = await pRes.json();
      if (pRes.ok) {
        setProducts(pData.products || []);
        setLimit(pData.limit || shopProductLimit(s));
      }
    } else {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login?next=/mypage/shop');
        return;
      }
      setToken(data.session.access_token);
      try {
        await load(data.session.access_token);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, router]);

  useEffect(() => {
    if (!token) return;
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      setMessage('결제가 완료되었습니다. 요금제/한도가 곧 반영됩니다.');
      load(token).catch(() => {});
    }
    if (checkout === 'cancel') {
      setMessage('결제가 취소되었습니다.');
    }
  }, [token, searchParams, load]);

  async function startCheckout(plan, interval = 'month') {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/seller/subscribe', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ plan, interval }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '결제 시작 실패');
      if (payload.url) window.location.href = payload.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(product) {
    setError('');
    setBusyId(product.id);
    try {
      const res = await fetch('/api/seller/products', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id: product.id, is_active: product.is_active === false }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '수정 실패');
      await load(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`「${product.title}」을(를) 삭제할까요?`)) return;
    setError('');
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/seller/products?id=${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '삭제 실패');
      await load(token);
      setMessage('상품을 삭제했습니다.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  if (loading) {
    return (
      <div className="container mypage">
        <div className="card empty-state">로딩 중…</div>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="container mypage">
        <header className="mypage-hero">
          <div className="mypage-hero-text">
            <p className="mypage-kicker">Shop</p>
            <h1 className="mypage-title">내 가게 관리</h1>
            <p className="mypage-meta">사업자 입점 후 상품을 등록할 수 있습니다.</p>
          </div>
        </header>
        <div className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 18 }}>사업자 입점</h2>
          <p className="hint-text" style={{ marginTop: 8, lineHeight: 1.55 }}>
            일반 셀러: 월 $10 또는 연 $100(2개월 무료) · 최대 6개 상품
            <br />
            프로 셀러: 월 $20 또는 연 $200(2개월 무료) · 최대 20개 상품 · 이후 10개당 +$8/월
          </p>
          <p className="hint-text" style={{ marginTop: 8 }}>
            회원별 프로모션(서비스별)은 관리자 설정이며, 입점 요금제와 별개입니다.
          </p>
          <div className="mypage-empty-actions" style={{ marginTop: 16 }}>
            <Link href="/mypage/shop/apply" className="btn">
              사업자 입점 신청
            </Link>
            <Link href="/shop" className="btn btn-outline">
              공개 튤립가게
            </Link>
            <Link href="/mypage" className="btn btn-outline">
              마이페이지
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = products.filter((p) => p.is_active !== false).length;
  const canManage = canManageShopProducts(sponsor);
  const atLimit = canManage && activeCount >= limit;
  const tierLabel = sponsor.plan_tier === 'extended' ? '프로 셀러' : '일반 셀러';
  const trialActive =
    sponsor.trial_ends_at && new Date(sponsor.trial_ends_at).getTime() > Date.now();

  return (
    <div className="container mypage">
      <header className="mypage-hero">
        <div className="mypage-hero-text">
          <p className="mypage-kicker">Shop</p>
          <h1 className="mypage-title">내 가게 관리</h1>
          <p className="mypage-meta">
            {sponsor.business_name}
            {' · '}
            {SELLER_STATUS_LABEL[sponsor.status] || sponsor.status}
            {sponsor.city ? ` · ${sponsor.city}` : ''}
            {canManage ? ` · ${tierLabel} · 상품 ${activeCount}/${limit}` : ''}
          </p>
        </div>
        <div className="mypage-empty-actions" style={{ flexWrap: 'wrap' }}>
          <Link href="/mypage" className="btn btn-outline">
            마이페이지
          </Link>
          <Link href="/shop" className="btn btn-outline">
            공개 가게
          </Link>
          {canManage ? (
            <Link href="/mypage/shop/new" className="btn">
              상품 등록
            </Link>
          ) : null}
        </div>
      </header>

      {message ? <div className="hint-text" style={{ marginBottom: 12 }}>{message}</div> : null}
      {error ? <div className="error-text" style={{ marginBottom: 12 }}>{error}</div> : null}

      {sponsor.status === 'pending' ? (
        <section className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 16 }}>승인 대기</h2>
          <p className="hint-text" style={{ marginTop: 8 }}>
            관리자 검토 중입니다. 승인되면 상품을 등록하고 요금제를 선택할 수 있습니다.
          </p>
        </section>
      ) : null}

      {sponsor.status === 'rejected' ? (
        <section className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 16 }}>입점 거절</h2>
          <p className="hint-text" style={{ marginTop: 8 }}>
            {sponsor.review_notes ? `사유: ${sponsor.review_notes}` : '입점이 거절되었습니다.'}
          </p>
          <Link href="/mypage/shop/apply" className="btn" style={{ marginTop: 12, display: 'inline-flex' }}>
            다시 신청
          </Link>
        </section>
      ) : null}

      {canManage ? (
        <section className="mypage-section card">
          <h2 className="section-title" style={{ fontSize: 16 }}>요금제</h2>
          <p className="hint-text" style={{ marginTop: 8, lineHeight: 1.55 }}>
            일반 셀러: 월 $10 / 연 $100(2개월 무료) · 최대 6개
            <br />
            프로 셀러: 월 $20 / 연 $200(2개월 무료) · 최대 20개 · 이후 10개당 +$8/월
          </p>
          {trialActive ? (
            <p className="hint-text" style={{ marginTop: 8 }}>
              입점 무료 체험 중 · {new Date(sponsor.trial_ends_at).toLocaleDateString('ko-KR')}까지
              (회원 프로모션과 별개)
            </p>
          ) : (
            <p className="hint-text" style={{ marginTop: 8 }}>
              회원 대상 기간 프로모션은 관리자가 서비스별로 설정하며, 위 요금제와 별개입니다.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => startCheckout('basic', 'month')}
            >
              일반 · 월 $10
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => startCheckout('basic', 'year')}
            >
              일반 · 연 $100
            </button>
            {sponsor.plan_tier !== 'extended' ? (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => startCheckout('upgrade', 'month')}
                >
                  프로 · 월 $20
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => startCheckout('upgrade', 'year')}
                >
                  프로 · 연 $200
                </button>
              </>
            ) : (
              <>
                <span className="hint-text">프로 셀러 이용 중 · 한도 {limit}개</span>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => startCheckout('extra_pack', 'month')}
                >
                  상품 10개 추가 (+$8/월)
                </button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="mypage-section card">
          <div className="mypage-section-head">
            <h2 className="section-title" style={{ fontSize: 16, margin: 0 }}>
              내 상품
            </h2>
            <span className="mypage-count">
              {activeCount}/{limit}
            </span>
          </div>
          {atLimit ? (
            <p className="hint-text" style={{ marginBottom: 12 }}>
              상품 등록 한도에 도달했습니다. 프로 셀러 업그레이드 또는 추가 팩을 이용해 주세요.
            </p>
          ) : null}
          <div className="mypage-empty-actions" style={{ marginBottom: 12 }}>
            <Link href="/mypage/shop/new" className="btn">
              상품 등록
            </Link>
            <Link href={`/shop/seller/${sponsor.id}`} className="btn btn-outline">
              스토어 보기
            </Link>
          </div>
          {products.length ? (
            <ul className="mypage-list">
              {products.map((p) => (
                <li key={p.id} className="mypage-list-row">
                  <div>
                    <Link href={`/shop/${p.id}`} className="mypage-post-link">
                      <strong>{p.title}</strong>
                    </Link>
                    <p className="mypage-list-sub">
                      {formatPriceCents(p.price_cents)}
                      {p.is_active === false ? ' · 비공개' : ' · 공개'}
                    </p>
                  </div>
                  <div className="mypage-empty-actions" style={{ gap: 8 }}>
                    <Link href={`/mypage/shop/products/${p.id}/edit`} className="btn btn-outline">
                      수정
                    </Link>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busyId === p.id}
                      onClick={() => toggleActive(p)}
                    >
                      {p.is_active === false ? '공개' : '비공개'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busyId === p.id}
                      onClick={() => removeProduct(p)}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mypage-empty">
              <p>등록된 상품이 없습니다.</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default function MyPageShopPage() {
  return (
    <Suspense
      fallback={
        <div className="container mypage">
          <div className="card empty-state">로딩 중…</div>
        </div>
      }
    >
      <MyPageShopInner />
    </Suspense>
  );
}
