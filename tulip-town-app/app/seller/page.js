'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import {
  SELLER_STATUS_LABEL,
  canManageShopProducts,
  formatPriceCents,
  shopProductLimit,
} from '../../lib/sellerConstants';

function SellerDashboardInner() {
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
        router.replace('/login?next=/seller');
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

  async function startCheckout(plan) {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/seller/subscribe', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ plan }),
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

  if (loading) {
    return (
      <div className="container">
        <div className="card empty-state">로딩 중…</div>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="container">
        <div className="card empty-state">
          아직 입점 신청이 없습니다.
          <div style={{ marginTop: 12 }}>
            <Link href="/seller/apply" className="btn">
              사업자 입점 신청
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = products.filter((p) => p.is_active !== false).length;
  const canManage = canManageShopProducts(sponsor);

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title">판매자 · {sponsor.business_name}</h2>
          <p className="hint-text">
            상태: {SELLER_STATUS_LABEL[sponsor.status] || sponsor.status}
            {sponsor.city ? ` · ${sponsor.city}` : ''}
            {canManage
              ? ` · 요금제 ${sponsor.plan_tier === 'extended' ? '확장' : '기본'} · 상품 ${activeCount}/${limit}`
              : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/shop" className="btn btn-outline">
            튤립가게
          </Link>
          {canManage ? (
            <Link href="/shop/new" className="btn">
              상품 등록
            </Link>
          ) : null}
        </div>
      </div>

      {message ? <div className="hint-text" style={{ marginBottom: 12 }}>{message}</div> : null}
      {error ? <div className="error-text">{error}</div> : null}

      {sponsor.status === 'pending' ? (
        <div className="card" style={{ marginBottom: 16 }}>
          관리자 검토 중입니다. 승인되면 안내드리며, 승인 후 상품을 등록할 수 있습니다.
        </div>
      ) : null}

      {sponsor.status === 'rejected' ? (
        <div className="card" style={{ marginBottom: 16 }}>
          입점이 거절되었습니다.
          {sponsor.review_notes ? ` 사유: ${sponsor.review_notes}` : ''}
          <div style={{ marginTop: 12 }}>
            <Link href="/seller/apply" className="btn">
              다시 신청
            </Link>
          </div>
        </div>
      ) : null}

      {canManage ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="section-title" style={{ fontSize: 16 }}>요금제</h3>
          <p className="hint-text">
            기본 $10 / 상품 6개 · 확장 +$20 / 최대 30개. 승인 후 판매자가 구독을 시작합니다.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => startCheckout('basic')}
            >
              기본 구독 ($10)
            </button>
            {sponsor.plan_tier !== 'extended' ? (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => startCheckout('upgrade')}
              >
                확장 업그레이드 (+$20)
              </button>
            ) : (
              <span className="hint-text">확장 요금제 이용 중</span>
            )}
          </div>
        </div>
      ) : null}

      {canManage ? (
        <div className="card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 className="section-title" style={{ fontSize: 16, margin: 0 }}>내 상품</h3>
            <Link href={`/shop/seller/${sponsor.id}`} className="btn btn-outline">
              스토어 보기
            </Link>
          </div>
          {products.length ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {products.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid #eef1f4',
                  }}
                >
                  <div>
                    <Link href={`/shop/${p.id}`}>
                      <strong>{p.title}</strong>
                    </Link>
                    <div className="hint-text">
                      {formatPriceCents(p.price_cents)}
                      {p.is_active === false ? ' · 비공개' : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">등록된 상품이 없습니다.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function SellerPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="card empty-state">로딩 중…</div>
        </div>
      }
    >
      <SellerDashboardInner />
    </Suspense>
  );
}
