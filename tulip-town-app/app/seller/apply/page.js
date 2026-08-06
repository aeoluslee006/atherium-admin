'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { SELLER_CITIES } from '../../../lib/sellerConstants';

export default function SellerApplyPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    shop_name: '',
    contact_name: '',
    phone: '',
    email: '',
    city: 'Holland',
    seller_type: 'individual',
    business_name: '',
    bio: '',
    pickup_note: '',
    agree: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user?.email) {
        setForm((f) => ({ ...f, email: data.session.user.email }));
      }
      if (!data.session) {
        router.replace('/login?next=/seller/apply');
      }
    });
  }, [router]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('로그인이 필요합니다.');

      const res = await fetch('/api/seller/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '신청 실패');
      router.push('/seller');
      router.refresh();
    } catch (err) {
      setError(err.message || '신청에 실패했습니다.');
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

  return (
    <div className="container seller-apply">
      <div className="row-between">
        <div>
          <h2 className="section-title">판매자 신청 · 튤립가게</h2>
          <p className="hint-text">
            사업자등록 없어도 개인으로 판매할 수 있어요. 아래 정보만 있으면 신청됩니다.
          </p>
        </div>
        <Link href="/gift" className="btn btn-outline">
          튤립가게
        </Link>
      </div>

      <form className="card form-card seller-apply-form" onSubmit={handleSubmit}>
        <label htmlFor="shop_name">상점명 *</label>
        <input
          id="shop_name"
          value={form.shop_name}
          onChange={(e) => update('shop_name', e.target.value)}
          placeholder="예: 미나네 베이크"
          required
        />

        <label htmlFor="contact_name">이름(담당자) *</label>
        <input
          id="contact_name"
          value={form.contact_name}
          onChange={(e) => update('contact_name', e.target.value)}
          placeholder="본명"
          required
        />

        <label htmlFor="phone">휴대폰 *</label>
        <input
          id="phone"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="연락 가능한 번호"
          required
        />

        <label htmlFor="email">이메일 *</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          required
        />

        <label htmlFor="city">지역 *</label>
        <select id="city" value={form.city} onChange={(e) => update('city', e.target.value)}>
          {SELLER_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="seller_type">판매 유형 *</label>
        <select
          id="seller_type"
          value={form.seller_type}
          onChange={(e) => update('seller_type', e.target.value)}
        >
          <option value="individual">개인 (사업자 없음 OK)</option>
          <option value="business">사업자/상호 있음</option>
        </select>

        {form.seller_type === 'business' ? (
          <>
            <label htmlFor="business_name">상호(선택)</label>
            <input
              id="business_name"
              value={form.business_name}
              onChange={(e) => update('business_name', e.target.value)}
              placeholder="사업자 상호"
            />
          </>
        ) : null}

        <label htmlFor="bio">소개 *</label>
        <textarea
          id="bio"
          value={form.bio}
          onChange={(e) => update('bio', e.target.value)}
          placeholder="무엇을 파는지, 어떻게 전달하는지 짧게 적어 주세요."
          required
        />

        <label htmlFor="pickup_note">수령/배송 안내 (선택)</label>
        <textarea
          id="pickup_note"
          value={form.pickup_note}
          onChange={(e) => update('pickup_note', e.target.value)}
          placeholder="예: Holland 픽업 / 그랜드래피즈 배송 가능"
        />

        <label className="seller-agree">
          <input
            type="checkbox"
            checked={form.agree}
            onChange={(e) => update('agree', e.target.checked)}
          />
          <span>
            판매 규칙을 이해하고, 허위 상품·금지 품목을 올리지 않으며, 월 $15 구독 및 판매액 2%
            수수료에 동의합니다.
          </span>
        </label>

        {error ? <div className="error-text">{error}</div> : null}

        <button className="btn" type="submit" disabled={saving || !session}>
          {saving ? '신청 중…' : '판매자 신청하기'}
        </button>
      </form>
    </div>
  );
}
