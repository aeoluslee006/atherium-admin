'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const CITIES = ['Holland', 'Grand Rapids', 'Zeeland', 'Hudsonville', 'Other'];
const CATEGORIES = ['생활용품', '가전', '가구', '유아/아동', '패션', '식품', '기타'];

export default function ShopNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    business_name: '',
    price_text: '',
    category: '생활용품',
    city: 'Holland',
    contact: '',
    image_url: '',
    description: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoading(false);
      if (!data.session) router.replace('/login?next=/shop/new');
    });
  }, [router]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('로그인이 필요합니다.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, banned_reason, suspended_until')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();

      if (profile?.is_banned) {
        setError(profile.banned_reason || '이용이 제한된 계정입니다.');
        return;
      }
      if (profile?.suspended_until && new Date(profile.suspended_until).getTime() > Date.now()) {
        setError(`계정이 ${new Date(profile.suspended_until).toLocaleString('ko-KR')}까지 정지되었습니다.`);
        return;
      }

      const { error: insertError } = await supabase.from('sponsors').insert({
        business_name: form.business_name.trim(),
        description: form.description.trim(),
        category: form.category,
        city: form.city,
        contact: form.contact.trim(),
        image_url: form.image_url.trim() || null,
        price_text: form.price_text.trim() || null,
        listing_type: 'shop',
        status: 'pending',
        submitted_by: sessionData.session.user.id,
      });
      if (insertError) throw insertError;

      setMessage('등록되었습니다. 관리자 승인 후 튤립가게에 노출됩니다. (첫 3개월 무료)');
      setTimeout(() => router.push('/shop'), 1200);
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

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title">튤립가게 · 물건 올리기</h2>
          <p className="hint-text">
            앱 결제 없음 · 문의처로 직접 거래 · 입점 월 $10 (첫 3개월 무료, 승인 시 적용)
          </p>
        </div>
        <Link href="/shop" className="btn btn-outline">
          목록
        </Link>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        <label htmlFor="business_name">제목 (상품/판매자명) *</label>
        <input
          id="business_name"
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          placeholder="예: 아이스박스 대형 / 미나네 베이크 세트"
          required
        />

        <label htmlFor="price_text">가격 표시</label>
        <input
          id="price_text"
          value={form.price_text}
          onChange={(e) => update('price_text', e.target.value)}
          placeholder='예: $15 · 나눔 · $20 OBO'
        />

        <label htmlFor="category">분류</label>
        <select id="category" value={form.category} onChange={(e) => update('category', e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="city">지역</label>
        <select id="city" value={form.city} onChange={(e) => update('city', e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="contact">구매 문의처 *</label>
        <input
          id="contact"
          value={form.contact}
          onChange={(e) => update('contact', e.target.value)}
          placeholder="휴대폰 / 카톡 ID / 이메일"
          required
        />

        <label htmlFor="image_url">사진 URL</label>
        <input
          id="image_url"
          value={form.image_url}
          onChange={(e) => update('image_url', e.target.value)}
          placeholder="https://..."
        />

        <label htmlFor="description">설명 *</label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="상태, 픽업 가능 여부, 거래 방법 등"
          required
        />

        {error ? <div className="error-text">{error}</div> : null}
        {message ? <div className="hint-text">{message}</div> : null}

        <button className="btn" type="submit" disabled={saving}>
          {saving ? '등록 중…' : '등록하고 승인 요청'}
        </button>
      </form>
    </div>
  );
}
