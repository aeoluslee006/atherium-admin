'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { listDirectoryCategories, isValidDirectoryCategory } from '../../../lib/directoryCategories';
import { formatSlotPrice, sizeTierLabel } from '../../../lib/directorySlots';
import { supabase } from '../../../lib/supabaseClient';

function ApplyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotId = searchParams.get('slot') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({
    business_name: '',
    category_slug: 'restaurant',
    ad_phone: '',
    ad_image_url: '',
  });

  const categories = useMemo(() => listDirectoryCategories(), []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(`/directory/pages/apply?slot=${slotId}`)}`);
        return;
      }
      if (!slotId) {
        setError('슬롯이 지정되지 않았습니다.');
        setLoading(false);
        return;
      }
      try {
        const { data: row, error: slotErr } = await supabase
          .from('directory_slots')
          .select('*')
          .eq('id', slotId)
          .maybeSingle();
        if (slotErr) throw slotErr;
        if (!row) throw new Error('슬롯을 찾을 수 없습니다.');
        if (row.status !== 'available') throw new Error('이미 판매된 자리입니다.');
        if (!cancelled) {
          setSlot(row);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || '슬롯을 불러오지 못했습니다.');
          setLoading(false);
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [router, slotId]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImage(file) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) throw new Error('로그인이 필요합니다.');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${uid}/dir-ad-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('post-images').upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('post-images').getPublicUrl(path);
      update('ad_image_url', pub?.publicUrl || '');
    } catch (err) {
      setError(err.message || '이미지 업로드 실패');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (!isValidDirectoryCategory(form.category_slug)) {
        throw new Error('카테고리를 선택해 주세요.');
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('로그인이 필요합니다.');

      const res = await fetch('/api/directory-slot/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slot_id: slotId,
          business_name: form.business_name.trim(),
          category_slug: form.category_slug,
          ad_phone: form.ad_phone.trim(),
          ad_image_url: form.ad_image_url.trim() || null,
          ad_title: form.business_name.trim(),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '결제 시작 실패');
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
      throw new Error('Checkout URL이 없습니다.');
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
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title">지면 광고 신청</h2>
          <p className="hint-text">결제 완료 후 즉시 지면에 게재됩니다. (사업자 서류 심사 없음)</p>
        </div>
        <Link href="/directory/pages" className="btn btn-outline">
          지면으로
        </Link>
      </div>

      {slot ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>
            {slot.page_number}면 · {slot.position_label} · {sizeTierLabel(slot.size_tier)} ·{' '}
            {formatSlotPrice(slot.base_price_cents)}
          </strong>
        </div>
      ) : null}

      <form className="card form-card" onSubmit={handleSubmit}>
        <label htmlFor="business_name">업체명 *</label>
        <input
          id="business_name"
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          required
          placeholder="광고에 표시될 업체명"
        />

        <label htmlFor="category_slug">카테고리 *</label>
        <select
          id="category_slug"
          value={form.category_slug}
          onChange={(e) => update('category_slug', e.target.value)}
          required
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.icon} {c.nameKo}
            </option>
          ))}
        </select>

        <label htmlFor="ad_phone">전화번호 *</label>
        <input
          id="ad_phone"
          value={form.ad_phone}
          onChange={(e) => update('ad_phone', e.target.value)}
          required
          placeholder="616-555-0100"
        />

        <label htmlFor="ad_image">광고 이미지</label>
        <input
          id="ad_image"
          type="file"
          accept="image/*"
          disabled={uploading || saving}
          onChange={(e) => handleImage(e.target.files?.[0])}
        />
        {uploading ? <p className="hint-text">업로드 중…</p> : null}
        {form.ad_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.ad_image_url} alt="" style={{ maxWidth: 220, marginTop: 8, borderRadius: 8 }} />
        ) : null}

        {error ? <div className="error-text">{error}</div> : null}

        <button className="btn" type="submit" disabled={saving || uploading || !slot}>
          {saving ? '결제창 여는 중…' : '결제하고 게재하기'}
        </button>
      </form>
    </div>
  );
}

export default function DirectorySlotApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="card empty-state">로딩 중…</div>
        </div>
      }
    >
      <ApplyInner />
    </Suspense>
  );
}
