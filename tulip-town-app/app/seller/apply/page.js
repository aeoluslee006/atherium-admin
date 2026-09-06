'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { SELLER_CITIES, isValidEin } from '../../../lib/sellerConstants';

const SOS_BUCKET = 'seller-documents';
const SOS_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic';

export default function SellerApplyPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [sosFileName, setSosFileName] = useState('');
  const [form, setForm] = useState({
    business_name: '',
    business_address: '',
    ein: '',
    city: 'Holland',
    sos_document_path: '',
    description: '',
    agree: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (!data.session) {
        router.replace('/login?next=/seller/apply');
      }
    });
  }, [router]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSosUpload(file) {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) throw new Error('로그인이 필요합니다.');

      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
      const path = `${uid}/sos-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(SOS_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;

      update('sos_document_path', path);
      setSosFileName(file.name);
    } catch (err) {
      setError(err.message || '서류 업로드에 실패했습니다.');
      update('sos_document_path', '');
      setSosFileName('');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (!isValidEin(form.ein)) {
        throw new Error('EIN 형식이 올바르지 않습니다. 예: 12-3456789');
      }
      if (!form.sos_document_path) {
        throw new Error('Secretary of State 서류를 업로드해 주세요.');
      }
      if (!form.agree) {
        throw new Error('입점 약관에 동의해 주세요.');
      }

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
      setDone(true);
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

  if (done) {
    return (
      <div className="container seller-apply">
        <div className="card form-card" style={{ textAlign: 'center', padding: '40px 28px' }}>
          <h2 className="section-title">신청이 접수되었습니다</h2>
          <p className="hint-text" style={{ marginTop: 12, lineHeight: 1.6 }}>
            관리자 검토 중입니다. 승인되면 안내드립니다.
            <br />
            승인 전에는 상품을 등록할 수 없습니다.
          </p>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/shop" className="btn btn-outline">
              튤립가게
            </Link>
            <Link href="/seller" className="btn">
              판매자 홈
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container seller-apply">
      <div className="row-between">
        <div>
          <h2 className="section-title">사업자 입점 신청 · 튤립가게</h2>
          <p className="hint-text">
            튤립가게는 사업자만 입점할 수 있습니다. 개인 판매는 불가하며, 승인 전까지 결제는 없습니다.
          </p>
        </div>
        <Link href="/shop" className="btn btn-outline">
          튤립가게
        </Link>
      </div>

      <form className="card form-card seller-apply-form" onSubmit={handleSubmit}>
        <label htmlFor="business_name">사업자명 *</label>
        <input
          id="business_name"
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          placeholder="예: Mina Bake LLC"
          required
        />

        <label htmlFor="business_address">사업자 주소 *</label>
        <input
          id="business_address"
          value={form.business_address}
          onChange={(e) => update('business_address', e.target.value)}
          placeholder="Street, City, MI ZIP"
          required
        />

        <label htmlFor="ein">EIN *</label>
        <input
          id="ein"
          value={form.ein}
          onChange={(e) => update('ein', e.target.value)}
          placeholder="12-3456789"
          pattern="\d{2}-\d{7}"
          required
        />
        <p className="hint-text">형식: XX-XXXXXXX (숫자 2자리-숫자 7자리)</p>

        <label htmlFor="city">지역 *</label>
        <select id="city" value={form.city} onChange={(e) => update('city', e.target.value)} required>
          {SELLER_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="sos">Secretary of State 서류 *</label>
        <input
          id="sos"
          type="file"
          accept={SOS_ACCEPT}
          disabled={uploading || saving}
          onChange={(e) => handleSosUpload(e.target.files?.[0])}
          required={!form.sos_document_path}
        />
        <p className="hint-text">
          사업자 등록 증빙 (PDF 또는 이미지). 업로드 경로: {'{uid}/sos-…'}
        </p>
        {uploading ? <p className="hint-text">업로드 중…</p> : null}
        {form.sos_document_path ? (
          <p className="hint-text">
            업로드됨: {sosFileName || form.sos_document_path}
          </p>
        ) : null}

        <label htmlFor="description">소개 (선택)</label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="판매 품목, 픽업/배송 안내 등"
        />

        <label className="seller-agree">
          <input
            type="checkbox"
            checked={form.agree}
            onChange={(e) => update('agree', e.target.checked)}
          />
          <span>
            사업자 정보가 사실임을 확인하며, 허위 상품·금지 품목을 올리지 않겠습니다. 승인 후 기본
            요금제(월 $10 · 상품 6개) 또는 확장 요금제를 이용할 수 있습니다.
          </span>
        </label>

        {error ? <div className="error-text">{error}</div> : null}

        <button className="btn" type="submit" disabled={saving || uploading || !session}>
          {saving ? '신청 중…' : '입점 신청하기'}
        </button>
      </form>
    </div>
  );
}
