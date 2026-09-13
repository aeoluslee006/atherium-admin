'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../../lib/supabaseClient';
import { formatPriceCents } from '../../../../../../lib/sellerConstants';
import { SHOP_CATEGORIES, SHOP_SHIPPING_FILTERS } from '../../../../../../lib/shopCatalog';

export default function MyPageShopProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    price_usd: '',
    image_url: '',
    category: 'other',
    shipping_scope: 'local',
    description: '',
    is_active: true,
  });

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    };
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace(`/login?next=/mypage/shop/products/${productId}/edit`);
        return;
      }
      try {
        const res = await fetch('/api/seller/products', { headers: await authHeaders() });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || '불러오기 실패');
        const product = (payload.products || []).find((p) => String(p.id) === String(productId));
        if (!product) throw new Error('상품을 찾을 수 없습니다.');
        if (!cancelled) {
          setForm({
            title: product.title || '',
            price_usd: product.price_cents != null ? String(Number(product.price_cents) / 100) : '',
            image_url: product.image_url || '',
            category: product.category || 'other',
            shipping_scope: product.shipping_scope === 'nationwide' ? 'nationwide' : 'local',
            description: product.description || '',
            is_active: product.is_active !== false,
          });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    if (productId) boot();
    return () => {
      cancelled = true;
    };
  }, [productId, router]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const priceUsd = Number(form.price_usd);
      if (!Number.isFinite(priceUsd) || priceUsd < 0) {
        throw new Error('가격을 확인해 주세요.');
      }
      const res = await fetch('/api/seller/products', {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({
          id: productId,
          title: form.title.trim(),
          description: form.description.trim(),
          price_usd: priceUsd,
          image_url: form.image_url.trim() || null,
          category: form.category,
          shipping_scope: form.shipping_scope,
          is_active: form.is_active,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '수정 실패');
      setMessage('저장되었습니다.');
      setTimeout(() => router.push('/mypage/shop'), 700);
    } catch (err) {
      setError(err.message || '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card empty-state">로딩 중…</div>
      </div>
    );
  }

  const categoryOptions = SHOP_CATEGORIES.filter((c) => c.id !== 'all');

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title">상품 수정</h2>
          <p className="hint-text">현재가 {formatPriceCents(Math.round(Number(form.price_usd || 0) * 100))}</p>
        </div>
        <Link href="/mypage/shop" className="btn btn-outline">
          가게 관리
        </Link>
      </div>

      {error && !form.title ? (
        <div className="card empty-state">
          {error}
          <div style={{ marginTop: 12 }}>
            <Link href="/mypage/shop" className="btn">
              돌아가기
            </Link>
          </div>
        </div>
      ) : (
        <form className="card form-card" onSubmit={handleSubmit}>
          <label htmlFor="title">상품명 *</label>
          <input
            id="title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />

          <label htmlFor="price_usd">가격 (USD) *</label>
          <input
            id="price_usd"
            type="number"
            min="0"
            step="0.01"
            value={form.price_usd}
            onChange={(e) => update('price_usd', e.target.value)}
            required
          />

          <label htmlFor="category">카테고리</label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <label htmlFor="shipping_scope">배송범위</label>
          <select
            id="shipping_scope"
            value={form.shipping_scope}
            onChange={(e) => update('shipping_scope', e.target.value)}
          >
            {SHOP_SHIPPING_FILTERS.filter((s) => s.id !== 'all').map((s) => (
              <option key={s.id} value={s.id}>
                {s.id === 'local' ? '로컬 (직거래·근처 배송)' : '전국배송'}
              </option>
            ))}
          </select>

          <label htmlFor="image_url">사진 URL</label>
          <input
            id="image_url"
            value={form.image_url}
            onChange={(e) => update('image_url', e.target.value)}
          />

          <label htmlFor="description">설명 *</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            required
          />

          <label className="seller-agree">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update('is_active', e.target.checked)}
            />
            <span>공개 (체크 해제 시 비공개)</span>
          </label>

          {error ? <div className="error-text">{error}</div> : null}
          {message ? <div className="hint-text">{message}</div> : null}

          <button className="btn" type="submit" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </form>
      )}
    </div>
  );
}
