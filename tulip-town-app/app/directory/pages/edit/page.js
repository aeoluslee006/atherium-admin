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
import { supabase } from '../../../../lib/supabaseClient';

function EditInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adId = searchParams.get('ad') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({
    business_name: '',
    category_slug: 'restaurant',
    ad_phone: '',
    ad_body: '',
    ad_image_urls: [],
  });

  const categories = useMemo(() => listDirectoryCategories(), []);
  const bodyMax = adBodyLimit(slot?.size_tier);
  const imageGuide = adImageGuide(slot?.size_tier);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(`/directory/pages/edit?ad=${adId}`)}`);
        return;
      }
      if (!adId) {
        setError('광고가 지정되지 않았습니다.');
        setLoading(false);
        return;
      }
      try {
        const token = data.session.access_token;
        const res = await fetch(`/api/directory-slot/ad?id=${encodeURIComponent(adId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || '광고를 불러오지 못했습니다.');
        if (cancelled) return;
        const ad = json.ad;
        setSlot(json.slot || ad?.directory_slots || null);
        setForm({
          business_name: ad.ad_title || '',
          category_slug: ad.category_slug || 'restaurant',
          ad_phone: ad.ad_phone || '',
          ad_body: ad.ad_body || '',
          ad_image_urls: normalizeAdImageUrls(ad.ad_image_urls, ad.ad_image_url),
        });
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || '불러오기 실패');
          setLoading(false);
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [router, adId]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      if (!isValidDirectoryCategory(form.category_slug)) {
        throw new Error('카테고리를 선택해 주세요.');
      }
      const bodyText = form.ad_body.trim();
      if (bodyText.length > bodyMax) {
        throw new Error(`광고 문구는 ${bodyMax}자 이내로 작성해 주세요.`);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('로그인이 필요합니다.');
      const urls = normalizeAdImageUrls(form.ad_image_urls);
      const res = await fetch('/api/directory-slot/ad', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: adId,
          business_name: form.business_name.trim(),
          ad_title: form.business_name.trim(),
          category_slug: form.category_slug,
          ad_phone: form.ad_phone.trim(),
          ad_body: bodyText || null,
          ad_image_urls: urls,
          ad_image_url: urls[0] || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '저장 실패');
      setNotice('광고가 수정되었습니다.');
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
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
          <h2 className="section-title">내 지면 광고 수정</h2>
          <p className="hint-text">본인이 올린 광고만 수정할 수 있습니다.</p>
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
        </div>
      ) : null}

      {notice ? <p className="hint-text" style={{ color: '#176b3a' }}>{notice}</p> : null}

      <form className="card form-card dir-ad-form" onSubmit={handleSubmit}>
        <label htmlFor="business_name">업체명 *</label>
        <input
          id="business_name"
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          required
          placeholder="광고에 표시될 업체명"
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
          placeholder="616-555-0100"
        />

        <label htmlFor="ad_body">광고 문구 (선택)</label>
        <p className="hint-text dir-ad-guide">{writingGuide(slot?.size_tier)}</p>
        <textarea
          id="ad_body"
          value={form.ad_body}
          onChange={(e) => update('ad_body', e.target.value.slice(0, bodyMax))}
          rows={3}
          maxLength={bodyMax}
          placeholder="짧은 소개 문구"
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

        {error ? <div className="error-text">{error}</div> : null}

        <button className="btn" type="submit" disabled={saving || uploading || !adId}>
          {saving ? '저장 중…' : '수정 저장'}
        </button>
      </form>
    </div>
  );
}

export default function DirectorySlotEditPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="card empty-state">로딩 중…</div>
        </div>
      }
    >
      <EditInner />
    </Suspense>
  );
}
