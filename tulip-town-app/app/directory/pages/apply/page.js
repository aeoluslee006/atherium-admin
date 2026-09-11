'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DIR_AD_MAX_IMAGE_BYTES,
  DIR_AD_MAX_IMAGES,
  adBodyLimit,
  adImageGuide,
  normalizeAdImageUrls,
  writingGuide,
} from '../../../../lib/directoryAdContent';
import { listDirectoryCategories, isValidDirectoryCategory } from '../../../../lib/directoryCategories';
import { formatSlotPrice, sizeTierLabel } from '../../../../lib/directorySlots';
import {
  SPECIAL_AD_EXTRA_CENTS,
  SPECIAL_AD_IMAGE_GUIDE,
  canAddSpecialAd,
} from '../../../../lib/directorySpecialAds';
import { supabase } from '../../../../lib/supabaseClient';

function ApplyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotId = searchParams.get('slot') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [slot, setSlot] = useState(null);
  const [specialFull, setSpecialFull] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    category_slug: 'restaurant',
    ad_phone: '',
    ad_body: '',
    ad_image_urls: [],
    is_special: false,
    special_image_url: '',
  });

  const categories = useMemo(() => listDirectoryCategories(), []);
  const bodyMax = adBodyLimit(slot?.size_tier);
  const imageGuide = adImageGuide(slot?.size_tier);
  const specialEligible = canAddSpecialAd(slot?.size_tier);
  const monthlyTotal =
    (Number(slot?.base_price_cents) || 0) + (form.is_special ? SPECIAL_AD_EXTRA_CENTS : 0);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!slotId) {
        setError('슬롯이 지정되지 않았습니다.');
        setLoading(false);
        return;
      }
      try {
        // Auth with timeout — getSession can hang on navigator locks.
        let session = null;
        try {
          const timed = await Promise.race([
            supabase.auth.getSession(),
            new Promise((resolve) => {
              setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 2500);
            }),
          ]);
          if (!timed?.timedOut) session = timed?.data?.session || null;
        } catch {
          session = null;
        }
        if (!session) {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData?.user) {
            router.replace(
              `/login?next=${encodeURIComponent(`/directory/pages/apply?slot=${slotId}`)}`
            );
            return;
          }
        }

        // Load slot via public API (avoids client RLS / session issues).
        const res = await fetch(`/api/directory-slot/meta?id=${encodeURIComponent(slotId)}`, {
          credentials: 'same-origin',
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || '슬롯을 불러오지 못했습니다.');
        const row = payload.slot;
        if (!row) throw new Error('슬롯을 찾을 수 없습니다.');
        if (row.status !== 'available') throw new Error('이미 판매된 자리입니다.');
        if (!cancelled) {
          setSlot(row);
          setError('');
        }

        try {
          const specialRes = await fetch('/api/directory-special', { credentials: 'same-origin' });
          const specialPayload = await specialRes.json().catch(() => ({}));
          if (!cancelled && specialRes.ok) {
            setSpecialFull(Boolean(specialPayload.full));
          }
        } catch {
          /* ignore */
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || '슬롯을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
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

  async function handleImages(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) throw new Error('로그인이 필요합니다.');

      const remaining = DIR_AD_MAX_IMAGES - form.ad_image_urls.length;
      if (remaining <= 0) throw new Error(`사진은 최대 ${DIR_AD_MAX_IMAGES}장까지입니다.`);

      const nextUrls = [...form.ad_image_urls];
      for (const file of files.slice(0, remaining)) {
        if (file.size > DIR_AD_MAX_IMAGE_BYTES) {
          throw new Error('각 사진은 2MB 이하여야 합니다.');
        }
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${uid}/dir-ad-${Date.now()}-${nextUrls.length}.${ext}`;
        const { error: upErr } = await supabase.storage.from('post-images').upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('post-images').getPublicUrl(path);
        if (pub?.publicUrl) nextUrls.push(pub.publicUrl);
      }
      update('ad_image_urls', nextUrls);
    } catch (err) {
      setError(err.message || '이미지 업로드 실패');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx) {
    update(
      'ad_image_urls',
      form.ad_image_urls.filter((_, i) => i !== idx)
    );
  }

  async function uploadOneImage(file, prefix) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error('로그인이 필요합니다.');
    if (file.size > DIR_AD_MAX_IMAGE_BYTES) {
      throw new Error('각 사진은 2MB 이하여야 합니다.');
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('post-images').upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('post-images').getPublicUrl(path);
    return pub?.publicUrl || '';
  }

  async function handleSpecialImage(fileList) {
    const file = Array.from(fileList || [])[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadOneImage(file, 'dir-special');
      if (!url) throw new Error('특별광고 이미지 업로드 실패');
      update('special_image_url', url);
    } catch (err) {
      setError(err.message || '특별광고 이미지 업로드 실패');
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
      const bodyText = form.ad_body.trim();
      if (bodyText.length > bodyMax) {
        throw new Error(`광고 문구는 ${bodyMax}자 이내로 작성해 주세요.`);
      }
      if (form.is_special && !form.special_image_url) {
        throw new Error('특별광고용 배너 이미지를 올려 주세요.');
      }

      let token = '';
      try {
        const timed = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 2500);
          }),
        ]);
        if (!timed?.timedOut) token = timed?.data?.session?.access_token || '';
      } catch {
        token = '';
      }
      if (!token) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) throw new Error('로그인이 필요합니다.');
      }

      const urls = normalizeAdImageUrls(form.ad_image_urls);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/directory-slot/checkout', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          slot_id: slotId,
          business_name: form.business_name.trim(),
          category_slug: form.category_slug,
          ad_phone: form.ad_phone.trim(),
          ad_body: bodyText || null,
          ad_image_urls: urls,
          ad_image_url: urls[0] || null,
          ad_title: form.business_name.trim(),
          is_special: Boolean(form.is_special && specialEligible),
          special_image_url: form.is_special ? form.special_image_url : null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || '결제 시작 실패');
      if (payload.free && payload.url) {
        window.location.href = payload.url;
        return;
      }
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

  if (error && !slot) {
    return (
      <div className="container">
        <div className="card empty-state">
          <p className="error-text">{error}</p>
          <Link href="/directory" className="btn btn-outline" style={{ marginTop: 12 }}>
            지면으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title">지면 광고 신청</h2>
          <p className="hint-text">프로모션이 있으면 결제 없이 바로 게재됩니다. 없으면 Stripe 결제로 진행됩니다. (사업자 서류 심사 없음)</p>
        </div>
        <Link href="/directory" className="btn btn-outline">
          지면으로
        </Link>
      </div>

      {slot ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>
            {slot.page_number}면 · {slot.position_label} · {sizeTierLabel(slot.size_tier)} ·{' '}
            {formatSlotPrice(slot.base_price_cents)}
          </strong>
          {form.is_special ? (
            <p className="hint-text" style={{ marginTop: 6 }}>
              특별광고 포함 합계 {formatSlotPrice(monthlyTotal)}
              {specialFull ? ' · 특별광고는 대기 등록' : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="card form-card dir-ad-form" onSubmit={handleSubmit}>
        <label htmlFor="business_name">업체명 *</label>
        <input
          id="business_name"
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          required
          maxLength={80}
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
        />

        <label htmlFor="ad_body">광고 문구 (선택)</label>
        <p className="hint-text dir-ad-guide">{writingGuide(slot?.size_tier)}</p>
        <textarea
          id="ad_body"
          value={form.ad_body}
          onChange={(e) => update('ad_body', e.target.value.slice(0, bodyMax))}
          rows={slot?.size_tier === 'ultra' ? 8 : slot?.size_tier === 'large' ? 5 : 3}
          maxLength={bodyMax}
        />
        <p className="hint-text">{form.ad_body.length}/{bodyMax}자</p>

        <label htmlFor="ad_image">광고 사진 (선택, 최대 {DIR_AD_MAX_IMAGES}장)</label>
        <div className="dir-ad-guide-box">
          <p>
            <strong>사진 가이드 · {imageGuide.label}</strong>
          </p>
          <ul>
            <li>{imageGuide.size}</li>
            <li>파일당 2MB 이하 · JPG/PNG/WebP</li>
            <li>여러 장 올리면 지면에서 슬라이드로 자동 전환됩니다</li>
            <li>{imageGuide.tip}</li>
          </ul>
        </div>
        <input
          id="ad_image"
          type="file"
          accept="image/*"
          multiple
          disabled={uploading || saving || form.ad_image_urls.length >= DIR_AD_MAX_IMAGES}
          onChange={(e) => {
            handleImages(e.target.files);
            e.target.value = '';
          }}
        />
        {uploading ? <p className="hint-text">업로드 중…</p> : null}
        {form.ad_image_urls.length ? (
          <div className="dir-ad-thumbs">
            {form.ad_image_urls.map((url, idx) => (
              <div key={`${url}-${idx}`} className="dir-ad-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <button type="button" className="btn btn-outline" onClick={() => removeImage(idx)}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {specialEligible ? (
          <fieldset className="dir-special-opt">
            <legend className="dir-special-opt-legend">첫 페이지 특별광고</legend>
            <label className="dir-special-check">
              <input
                type="checkbox"
                checked={form.is_special}
                onChange={(e) => update('is_special', e.target.checked)}
              />
              <span>첫 페이지 특별광고 슬라이드 추가 (+$2/월)</span>
            </label>
            {form.is_special ? (
              <div className="dir-special-opt-body">
                <p className="hint-text">
                  {specialFull
                    ? '지금은 특별광고 자리가 모두 찼습니다. 자리가 나면 순서대로 자동 노출됩니다. (체크 시 대기열에 등록됩니다.)'
                    : '6초마다 자동으로 돌아가는 첫 페이지 슬라이드에 노출됩니다.'}
                </p>
                <div className="dir-ad-guide-box">
                  <p>
                    <strong>특별광고 이미지 가이드</strong>
                  </p>
                  <ul>
                    <li>{SPECIAL_AD_IMAGE_GUIDE.size}</li>
                    <li>{SPECIAL_AD_IMAGE_GUIDE.formats}</li>
                    <li>{SPECIAL_AD_IMAGE_GUIDE.tip}</li>
                  </ul>
                </div>
                <label htmlFor="special_image">특별광고 배너 이미지 *</label>
                <input
                  id="special_image"
                  type="file"
                  accept="image/*"
                  disabled={uploading || saving}
                  onChange={(e) => {
                    handleSpecialImage(e.target.files);
                    e.target.value = '';
                  }}
                />
                {form.special_image_url ? (
                  <div className="dir-ad-thumbs">
                    <div className="dir-ad-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.special_image_url} alt="" />
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => update('special_image_url', '')}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {error ? <div className="error-text">{error}</div> : null}

        <button className="btn" type="submit" disabled={saving || uploading || !slot}>
          {saving ? '처리 중…' : '게재 신청하기'}
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
