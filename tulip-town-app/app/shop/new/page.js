'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { shopProductLimit } from '../../../lib/sellerConstants';

export default function ShopNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sponsor, setSponsor] = useState(null);
  const [limitInfo, setLimitInfo] = useState({ limit: 6, activeCount: 0 });
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [form, setForm] = useState({
    title: '',
    price_usd: '',
    image_url: '',
    description: '',
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
        router.replace('/login?next=/shop/new');
        return;
      }
      try {
        const meRes = await fetch('/api/seller/me', { headers: await authHeaders() });
        const me = await meRes.json();
        if (!meRes.ok) throw new Error(me.error || '판매자 정보를 불러오지 못했습니다.');
        const s = me.sponsor || me.seller;
        if (!s) {
          if (!cancelled) {
            setSponsor(null);
            setLoading(false);
          }
          return;
        }
        if (s.status !== 'approved') {
          if (!cancelled) {
            setSponsor(s);
            setLoading(false);
          }
          return;
        }
        const prodRes = await fetch('/api/seller/products', { headers: await authHeaders() });
        const prod = await prodRes.json();
        if (!cancelled) {
          setSponsor(s);
          setLimitInfo({
            limit: prod.limit || shopProductLimit(s),
            activeCount: prod.activeCount || 0,
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
    boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setNeedsUpgrade(false);
    setSaving(true);
    try {
      const priceUsd = Number(form.price_usd);
      if (!Number.isFinite(priceUsd) || priceUsd < 0) {
        throw new Error('가격을 확인해 주세요.');
      }
      const res = await fetch('/api/seller/products', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          price_usd: priceUsd,
          image_url: form.image_url.trim() || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload.code === 'PRODUCT_LIMIT' || payload.upgrade) {
          setNeedsUpgrade(true);
        }
        throw new Error(payload.error || '등록 실패');
      }
      setMessage('상품이 등록되었습니다.');
      setTimeout(() => router.push(`/shop/${payload.product.id}`), 800);
    } catch (err) {
      setError(err.message || '등록에 실패했습니다.');
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

  if (!sponsor) {
    return (
      <div className="container">
        <div className="card empty-state">
          사업자 입점 신청 후 상품을 등록할 수 있습니다.
          <div style={{ marginTop: 12 }}>
            <Link href="/seller/apply" className="btn">
              입점 신청하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (sponsor.status !== 'approved') {
    return (
      <div className="container">
        <div className="card empty-state">
          {sponsor.status === 'pending'
            ? '관리자 검토 중입니다. 승인되면 상품을 등록할 수 있습니다.'
            : sponsor.status === 'rejected'
              ? `입점 신청이 거절되었습니다.${sponsor.review_notes ? ` 사유: ${sponsor.review_notes}` : ''}`
              : '상품을 등록할 수 없는 상태입니다.'}
          <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/seller" className="btn btn-outline">
              판매자 홈
            </Link>
            {sponsor.status === 'rejected' ? (
              <Link href="/seller/apply" className="btn">
                다시 신청
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const atLimit = limitInfo.activeCount >= limitInfo.limit;

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title">튤립가게 · 상품 등록</h2>
          <p className="hint-text">
            {sponsor.business_name} · 활성 상품 {limitInfo.activeCount}/{limitInfo.limit}개
            {sponsor.plan_tier === 'extended' ? ' (확장 요금제)' : ' (기본 요금제)'}
          </p>
        </div>
        <Link href="/shop" className="btn btn-outline">
          목록
        </Link>
      </div>

      {atLimit || needsUpgrade ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>상품 한도에 도달했습니다.</strong>
          <p className="hint-text" style={{ marginTop: 8 }}>
            확장 요금제(+$20, 최대 30개)로 업그레이드하면 더 등록할 수 있습니다.
          </p>
          <Link href="/seller" className="btn" style={{ marginTop: 12, display: 'inline-flex' }}>
            업그레이드하러 가기
          </Link>
        </div>
      ) : null}

      <form className="card form-card" onSubmit={handleSubmit}>
        <label htmlFor="title">상품명 *</label>
        <input
          id="title"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="예: 수제 쿠키 박스"
          required
          disabled={atLimit}
        />

        <label htmlFor="price_usd">가격 (USD) *</label>
        <input
          id="price_usd"
          type="number"
          min="0"
          step="0.01"
          value={form.price_usd}
          onChange={(e) => update('price_usd', e.target.value)}
          placeholder="15"
          required
          disabled={atLimit}
        />

        <label htmlFor="image_url">사진 URL</label>
        <input
          id="image_url"
          value={form.image_url}
          onChange={(e) => update('image_url', e.target.value)}
          placeholder="https://..."
          disabled={atLimit}
        />

        <label htmlFor="description">설명 *</label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="상태, 구성, 픽업/배송 안내 등"
          required
          disabled={atLimit}
        />

        {error ? <div className="error-text">{error}</div> : null}
        {message ? <div className="hint-text">{message}</div> : null}

        <button className="btn" type="submit" disabled={saving || atLimit}>
          {saving ? '등록 중…' : '상품 등록'}
        </button>
      </form>
    </div>
  );
}
