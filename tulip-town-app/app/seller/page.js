'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import {
  SELLER_PRODUCT_LIMIT,
  SELLER_STATUS_LABEL,
  SUB_STATUS_LABEL,
  canManageProducts,
} from '../../lib/sellerConstants';

function SellerDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name_ko: '',
    price_usd: '',
    blurb: '',
    category: 'local',
    image_url: '',
  });

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
    setSeller(me.seller);

    if (me.seller) {
      const pRes = await fetch('/api/seller/products', { headers });
      const pData = await pRes.json();
      if (pRes.ok) setProducts(pData.products || []);
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
    const sessionId = searchParams.get('session_id');
    const checkout = searchParams.get('checkout');
    const connect = searchParams.get('connect');

    (async () => {
      try {
        if (checkout === 'success' && sessionId) {
          setBusy(true);
          const res = await fetch('/api/seller/confirm', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ session_id: sessionId }),
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error || '구독 확인 실패');
          setSeller(payload.seller);
          setMessage('월 구독이 활성화되었습니다. 이제 정산 계좌를 연결해 주세요.');
        }
        if (connect === 'return' || connect === 'refresh') {
          setBusy(true);
          const res = await fetch('/api/seller/connect', { headers: authHeaders() });
          const payload = await res.json();
          if (res.ok && payload.seller) {
            setSeller(payload.seller);
            setMessage(
              payload.charges_enabled
                ? '정산 계좌 연결 완료. 판매 결제를 받을 수 있습니다.'
                : 'Connect 정보를 더 입력해야 할 수 있습니다. 다시 연결을 진행해 주세요.'
            );
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    })();
  }, [token, searchParams, authHeaders]);

  async function startSubscribe() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/seller/subscribe', {
        method: 'POST',
        headers: authHeaders(),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '구독 시작 실패');
      window.location.href = payload.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function startConnect() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/seller/connect', {
        method: 'POST',
        headers: authHeaders(),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Connect 실패');
      window.location.href = payload.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function addProduct(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/seller/products', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '등록 실패');
      setProducts((prev) => [payload.product, ...prev]);
      setForm({ name_ko: '', price_usd: '', blurb: '', category: 'local', image_url: '' });
      setMessage('상품이 등록되었습니다.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(id) {
    if (!window.confirm('이 상품을 삭제할까요?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/seller/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '삭제 실패');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="container"><div className="card empty-state">로딩 중…</div></div>;
  }

  if (!seller) {
    return (
      <div className="container">
        <h2 className="section-title">판매자 센터</h2>
        <p className="hint-text">아직 판매자 신청이 없습니다.</p>
        <Link href="/seller/apply" className="btn">
          판매자 신청하기
        </Link>
      </div>
    );
  }

  const canProducts = canManageProducts(seller);
  const limit = seller.product_limit || SELLER_PRODUCT_LIMIT;

  return (
    <div className="container seller-dash">
      <div className="row-between">
        <div>
          <h2 className="section-title">{seller.shop_name}</h2>
          <p className="hint-text">
            상태: {SELLER_STATUS_LABEL[seller.status] || seller.status} · 구독:{' '}
            {SUB_STATUS_LABEL[seller.subscription_status] || seller.subscription_status} · 정산:{' '}
            {seller.charges_enabled ? '연결됨' : '미연결'}
          </p>
        </div>
        <Link href="/gift" className="btn btn-outline">
          튤립가게
        </Link>
      </div>

      {message ? <div className="sponsor-banner">{message}</div> : null}
      {error ? <div className="error-text">{error}</div> : null}

      {seller.status === 'pending' ? (
        <div className="card">관리자 승인 대기 중입니다. 승인되면 월 $15 구독을 진행해 주세요.</div>
      ) : null}
      {seller.status === 'rejected' ? (
        <div className="card">
          신청이 거절되었습니다. {seller.rejection_reason || ''}
          <div style={{ marginTop: 10 }}>
            <Link href="/seller/apply" className="btn">
              다시 신청
            </Link>
          </div>
        </div>
      ) : null}

      {seller.status === 'approved' && seller.subscription_status !== 'active' ? (
        <div className="card seller-step">
          <h3>1. 월 구독 $15</h3>
          <p className="hint-text">상품 {limit}개까지 등록 · 판매 수수료 2%</p>
          <button className="btn" type="button" onClick={startSubscribe} disabled={busy}>
            구독하고 시작하기
          </button>
        </div>
      ) : null}

      {seller.subscription_status === 'active' && !seller.charges_enabled ? (
        <div className="card seller-step">
          <h3>2. 정산 계좌 연결 (Stripe Connect)</h3>
          <p className="hint-text">
            개인도 가능합니다. Stripe가 신분증·은행 정보를 받고, 판매금의 98%가 계좌로 입금됩니다.
          </p>
          <button className="btn" type="button" onClick={startConnect} disabled={busy}>
            계좌 연결하기
          </button>
        </div>
      ) : null}

      {canProducts ? (
        <>
          <div className="card seller-step">
            <h3>
              상품 등록 ({products.length}/{limit})
            </h3>
            {!seller.charges_enabled ? (
              <p className="hint-text">상품은 등록할 수 있지만, 계좌 연결 전까지 손님 결제는 열리지 않습니다.</p>
            ) : null}
            <form className="form-card" onSubmit={addProduct}>
              <label htmlFor="name_ko">상품명</label>
              <input
                id="name_ko"
                value={form.name_ko}
                onChange={(e) => setForm((f) => ({ ...f, name_ko: e.target.value }))}
                required
              />
              <label htmlFor="price_usd">가격 (USD)</label>
              <input
                id="price_usd"
                type="number"
                min="0"
                step="0.01"
                value={form.price_usd}
                onChange={(e) => setForm((f) => ({ ...f, price_usd: e.target.value }))}
                required
              />
              <label htmlFor="category">카테고리</label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="local">동네맛·카페</option>
                <option value="care">생활·케어</option>
                <option value="kids">아이·가족</option>
                <option value="community">커뮤니티 특가</option>
              </select>
              <label htmlFor="image_url">이미지 URL</label>
              <input
                id="image_url"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
              <label htmlFor="blurb">설명</label>
              <textarea
                id="blurb"
                value={form.blurb}
                onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))}
                required
              />
              <button className="btn" type="submit" disabled={busy}>
                상품 올리기
              </button>
            </form>
          </div>

          <div className="card">
            <h3>내 상품</h3>
            {products.length ? (
              <ul className="seller-product-list">
                {products.map((p) => (
                  <li key={p.id} className="seller-product-row">
                    <div>
                      <strong>{p.name_ko}</strong>
                      <div className="hint-text">
                        ${(p.price_cents / 100).toFixed(2)} · {p.is_published ? '공개' : '비공개'}
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline" onClick={() => removeProduct(p.id)}>
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">아직 등록한 상품이 없습니다.</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function SellerPage() {
  return (
    <Suspense fallback={<div className="container"><div className="card empty-state">로딩 중…</div></div>}>
      <SellerDashboardInner />
    </Suspense>
  );
}
