'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import {
  SELLER_STATUS_LABEL,
  canManageShopProducts,
  formatPriceCents,
  shopProductLimit,
} from '../../../lib/sellerConstants';

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price_cents: '',
  currency: 'usd',
  image_url: '',
  is_active: true,
};

function ShopManageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [profileDraft, setProfileDraft] = useState({
    business_name: '',
    city: '',
    description: '',
    contact: '',
    image_url: '',
    website_url: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [productDraft, setProductDraft] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [busyProductId, setBusyProductId] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const load = useCallback(
    async (accessToken) => {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const meRes = await fetch('/api/seller/me', { headers, cache: 'no-store' });
      if (meRes.status === 401) {
        router.replace(`/login?next=${encodeURIComponent('/mypage/shop')}`);
        return;
      }
      const meJson = await meRes.json().catch(() => ({}));
      if (!meRes.ok) throw new Error(meJson.error || '매장 정보를 불러오지 못했습니다.');

      const nextShop = meJson.sponsor || meJson.seller || null;
      setShop(nextShop);
      if (nextShop) {
        setProfileDraft({
          business_name: nextShop.business_name || '',
          city: nextShop.city || '',
          description: nextShop.description || '',
          contact: nextShop.contact || '',
          image_url: nextShop.image_url || '',
          website_url: nextShop.website_url || '',
        });
      }

      if (nextShop && canManageShopProducts(nextShop)) {
        const productsRes = await fetch('/api/seller/products', { headers, cache: 'no-store' });
        const productsJson = await productsRes.json().catch(() => ({}));
        if (!productsRes.ok) throw new Error(productsJson.error || '상품 목록을 불러오지 못했습니다.');
        setProducts(Array.isArray(productsJson.products) ? productsJson.products : []);
      } else {
        setProducts([]);
      }
    },
    [router]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent('/mypage/shop')}`);
        return;
      }
      setToken(data.session.access_token);
      try {
        await load(data.session.access_token);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || '불러오기 실패');
          setShop(null);
          setProducts([]);
        }
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
      setNotice('구독 결제가 완료되었습니다. 상태가 반영되기까지 잠시 걸릴 수 있습니다.');
      load(token).catch(() => {});
    }
    if (checkout === 'cancel') {
      setNotice('결제가 취소되었습니다.');
    }
  }, [token, searchParams, load]);

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/seller/me', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(profileDraft),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || '매장 정보 저장 실패');
      const next = json.sponsor || json.seller || null;
      setShop(next);
      setNotice('매장 정보가 저장되었습니다.');
    } catch (err) {
      setError(err?.message || '저장 실패');
    } finally {
      setSavingProfile(false);
    }
  }

  function startEdit(product) {
    setEditingId(product.id);
    setProductDraft({
      name: product.name || '',
      description: product.description || '',
      price_cents: product.price_cents != null ? String((Number(product.price_cents) / 100).toFixed(2)) : '',
      currency: product.currency || 'usd',
      image_url: product.image_url || '',
      is_active: product.is_active !== false,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setProductDraft(EMPTY_PRODUCT);
  }

  async function saveProduct(e) {
    e.preventDefault();
    setSavingProduct(true);
    setError('');
    setNotice('');
    try {
      const dollars = Number(productDraft.price_cents);
      if (!Number.isFinite(dollars) || dollars < 0) {
        throw new Error('가격을 올바르게 입력해 주세요.');
      }
      const payload = {
        name: productDraft.name.trim(),
        description: productDraft.description.trim() || null,
        price_cents: Math.round(dollars * 100),
        currency: productDraft.currency || 'usd',
        image_url: productDraft.image_url.trim() || null,
        is_active: Boolean(productDraft.is_active),
      };
      if (!payload.name) throw new Error('상품명을 입력해 주세요.');

      const isEdit = Boolean(editingId);
      const res = await fetch('/api/seller/products', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(isEdit ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || '상품 저장 실패');

      cancelEdit();
      setNotice(isEdit ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.');
      await load(token);
    } catch (err) {
      setError(err?.message || '상품 저장 실패');
    } finally {
      setSavingProduct(false);
    }
  }

  async function toggleActive(product) {
    setBusyProductId(product.id);
    setError('');
    try {
      const res = await fetch('/api/seller/products', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id: product.id, is_active: !product.is_active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || '상태 변경 실패');
      await load(token);
    } catch (err) {
      setError(err?.message || '상태 변경 실패');
    } finally {
      setBusyProductId('');
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`"${product.name}" 상품을 삭제할까요?`)) return;
    setBusyProductId(product.id);
    setError('');
    try {
      const res = await fetch(`/api/seller/products?id=${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || '삭제 실패');
      if (editingId === product.id) cancelEdit();
      setNotice('상품이 삭제되었습니다.');
      await load(token);
    } catch (err) {
      setError(err?.message || '삭제 실패');
    } finally {
      setBusyProductId('');
    }
  }

  async function startCheckout(plan) {
    setError('');
    setCheckoutBusy(true);
    try {
      const res = await fetch('/api/seller/subscribe', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ plan }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '결제 시작 실패');
      if (payload.url) window.location.href = payload.url;
    } catch (err) {
      setError(err?.message || '결제 시작 실패');
    } finally {
      setCheckoutBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="container mypage">
        <p className="mypage-meta">매장 정보를 불러오는 중…</p>
      </div>
    );
  }

  const canManage = canManageShopProducts(shop);
  const limit = shopProductLimit(shop);
  const statusLabel = shop ? SELLER_STATUS_LABEL[shop.status] || shop.status : '';

  return (
    <div className="container mypage mypage-shop">
      <p className="mypage-back-row">
        <Link href="/mypage" className="mypage-back-link">
          ← 마이페이지
        </Link>
      </p>

      <header className="mypage-hero">
        <div className="mypage-hero-text">
          <p className="mypage-kicker">Shop</p>
          <h1 className="mypage-title">내 매장 관리</h1>
          <p className="mypage-meta">매장 정보와 상품을 수정하고 판매 상태를 관리합니다.</p>
        </div>
      </header>

      {notice ? (
        <p className="mypage-flash mypage-flash--ok" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mypage-flash mypage-flash--err" role="alert">
          {error}
        </p>
      ) : null}

      {!shop ? (
        <section className="mypage-section card">
          <div className="mypage-section-head">
            <h2>등록된 매장이 없습니다</h2>
          </div>
          <div className="mypage-empty">
            <p>판매자 신청 후 승인되면 여기서 매장을 관리할 수 있습니다.</p>
            <div className="mypage-empty-actions">
              <Link href="/seller/apply" className="btn btn-outline">
                판매자 신청
              </Link>
              <Link href="/seller" className="btn btn-outline">
                판매자 센터
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="mypage-section card">
            <div className="mypage-section-head">
              <h2>매장 상태</h2>
              <span className="mypage-count">{statusLabel}</span>
            </div>
            <dl className="mypage-dl">
              <div>
                <dt>플랜</dt>
                <dd>{shop.plan_tier || 'basic'}</dd>
              </div>
              <div>
                <dt>상품 한도</dt>
                <dd>
                  {products.length} / {limit}
                </dd>
              </div>
              {shop.review_notes ? (
                <div>
                  <dt>검토 메모</dt>
                  <dd>{shop.review_notes}</dd>
                </div>
              ) : null}
            </dl>
            {canManage ? (
              <div className="mypage-shop-actions">
                {shop.plan_tier !== 'extended' ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={checkoutBusy}
                      onClick={() => startCheckout('basic')}
                    >
                      월 구독 결제
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={checkoutBusy}
                      onClick={() => startCheckout('upgrade')}
                    >
                      확장 요금제
                    </button>
                  </>
                ) : null}
                <Link href="/seller" className="btn btn-outline">
                  판매자 센터
                </Link>
              </div>
            ) : (
              <p className="mypage-list-sub">
                승인된 매장만 상품을 관리할 수 있습니다. 신청 상태는{' '}
                <Link href="/seller">판매자 센터</Link>에서 확인하세요.
              </p>
            )}
          </section>

          <section className="mypage-section card">
            <div className="mypage-section-head">
              <h2>매장 정보</h2>
            </div>
            <form className="mypage-shop-form" onSubmit={saveProfile}>
              <label>
                상호명
                <input
                  value={profileDraft.business_name}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, business_name: e.target.value }))}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                도시
                <input
                  value={profileDraft.city}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, city: e.target.value }))}
                  maxLength={80}
                />
              </label>
              <label>
                소개
                <textarea
                  value={profileDraft.description}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, description: e.target.value }))}
                  rows={4}
                  maxLength={2000}
                />
              </label>
              <label>
                연락처
                <input
                  value={profileDraft.contact}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, contact: e.target.value }))}
                  maxLength={200}
                />
              </label>
              <label>
                대표 이미지 URL
                <input
                  value={profileDraft.image_url}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, image_url: e.target.value }))}
                  placeholder="https://"
                />
              </label>
              <label>
                웹사이트
                <input
                  value={profileDraft.website_url}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, website_url: e.target.value }))}
                  placeholder="https://"
                />
              </label>
              <button type="submit" className="btn" disabled={savingProfile}>
                {savingProfile ? '저장 중…' : '매장 정보 저장'}
              </button>
            </form>
          </section>

          {canManage ? (
            <>
              <section className="mypage-section card">
                <div className="mypage-section-head">
                  <h2>{editingId ? '상품 수정' : '상품 등록'}</h2>
                  <span className="mypage-count">
                    {products.length}/{limit}
                  </span>
                </div>
                <form className="mypage-shop-form" onSubmit={saveProduct}>
                  <label>
                    상품명
                    <input
                      value={productDraft.name}
                      onChange={(e) => setProductDraft((d) => ({ ...d, name: e.target.value }))}
                      required
                      maxLength={160}
                    />
                  </label>
                  <label>
                    설명
                    <textarea
                      value={productDraft.description}
                      onChange={(e) => setProductDraft((d) => ({ ...d, description: e.target.value }))}
                      rows={3}
                      maxLength={2000}
                    />
                  </label>
                  <label>
                    가격 (USD)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={productDraft.price_cents}
                      onChange={(e) => setProductDraft((d) => ({ ...d, price_cents: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    이미지 URL
                    <input
                      value={productDraft.image_url}
                      onChange={(e) => setProductDraft((d) => ({ ...d, image_url: e.target.value }))}
                      placeholder="https://"
                    />
                  </label>
                  <label className="mypage-shop-check">
                    <input
                      type="checkbox"
                      checked={productDraft.is_active}
                      onChange={(e) => setProductDraft((d) => ({ ...d, is_active: e.target.checked }))}
                    />
                    판매 중
                  </label>
                  <div className="mypage-shop-actions">
                    <button type="submit" className="btn" disabled={savingProduct}>
                      {savingProduct ? '저장 중…' : editingId ? '수정 저장' : '상품 등록'}
                    </button>
                    {editingId ? (
                      <button type="button" className="btn btn-outline" onClick={cancelEdit}>
                        취소
                      </button>
                    ) : null}
                  </div>
                </form>
              </section>

              <section className="mypage-section card">
                <div className="mypage-section-head">
                  <h2>내 상품</h2>
                  <span className="mypage-count">{products.length}개</span>
                </div>
                {products.length === 0 ? (
                  <div className="mypage-empty">
                    <p>등록된 상품이 없습니다.</p>
                  </div>
                ) : (
                  <ul className="mypage-list">
                    {products.map((product) => (
                      <li key={product.id} className="mypage-list-row mypage-list-row--stack">
                        <div>
                          <strong>{product.name}</strong>
                          <p className="mypage-list-sub">
                            {formatPriceCents(product.price_cents)}
                            {' · '}
                            {product.is_active ? '판매 중' : '숨김'}
                          </p>
                          {product.description ? (
                            <p className="mypage-list-sub">{product.description}</p>
                          ) : null}
                        </div>
                        <div className="mypage-shop-product-actions">
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => startEdit(product)}
                            disabled={busyProductId === product.id}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => toggleActive(product)}
                            disabled={busyProductId === product.id}
                          >
                            {product.is_active ? '숨기기' : '공개'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline mypage-btn-danger"
                            onClick={() => removeProduct(product)}
                            disabled={busyProductId === product.id}
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function ShopManagePage() {
  return (
    <Suspense
      fallback={
        <div className="container mypage">
          <p className="mypage-meta">불러오는 중…</p>
        </div>
      }
    >
      <ShopManageInner />
    </Suspense>
  );
}
