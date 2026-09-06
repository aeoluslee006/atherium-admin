'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const CITIES = ['Holland', 'Grand Rapids', 'Zeeland', 'Hudsonville', 'Other'];

function NewBusinessForm() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get('checkout') === 'cancel';

  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('Holland');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(
    canceled ? '결제가 취소되었습니다. 다시 등록하거나 결제를 진행해 주세요.' : ''
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('업체 등록은 로그인이 필요합니다.');
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

      const { data: sponsor, error: insertError } = await supabase
        .from('sponsors')
        .insert({
          business_name: businessName,
          category,
          city,
          website_url: websiteUrl || null,
          description,
          status: 'pending',
          submitted_by: sessionData.session.user.id,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ sponsor_id: sponsor.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '결제 세션 생성 실패');
      if (!payload.url) throw new Error('Stripe Checkout URL이 없습니다. STRIPE 환경변수를 확인하세요.');
      window.location.href = payload.url;
    } catch (err) {
      setError(err.message || '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <label htmlFor="name">업체명</label>
      <input id="name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
      <label htmlFor="category">업종</label>
      <input
        id="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="식당, 미용실, 보험 등"
      />
      <label htmlFor="city">지역</label>
      <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
        {CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label htmlFor="website">웹사이트</label>
      <input id="website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
      <label htmlFor="description">소개</label>
      <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      {error ? <div className="error-text">{error}</div> : null}
      {message ? <div className="hint-text">{message}</div> : null}
      <button className="btn" type="submit" disabled={saving}>
        {saving ? '결제 준비 중…' : '등록하고 결제하기'}
      </button>
    </form>
  );
}

export default function NewBusinessPage() {
  return (
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title">업체 등록 · Sponsor listing</h2>
          <div className="hint-text">등록 후 Stripe 월 구독 결제로 이어집니다.</div>
        </div>
        <Link href="/seller" className="btn btn-outline">
          내 업체 관리
        </Link>
      </div>
      <Suspense fallback={<div className="card empty-state">로딩 중…</div>}>
        <NewBusinessForm />
      </Suspense>
    </div>
  );
}
