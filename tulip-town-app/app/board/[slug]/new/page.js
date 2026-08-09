'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import JobsComposeForm from '../../../../components/JobsComposeForm';
import HousingPhotosField from '../../../../components/HousingPhotosField';
import MarketBodyEditor from '../../../../components/MarketBodyEditor';
import { getCategory } from '../../../../lib/categories';
import { FREE_BOARD_WRITE_TAGS, isValidFreeBoardWriteTag } from '../../../../lib/freeBoardTags';
import { HOUSING_TAGS, HOUSING_TYPES, isValidHousingTag } from '../../../../lib/housingTags';
import { MARKET_TAGS, isValidMarketTag } from '../../../../lib/marketTags';
import { serializeImageUrls } from '../../../../lib/postImages';
import { supabase } from '../../../../lib/supabaseClient';

const CITIES = ['Holland', 'Grand Rapids', 'Zeeland', 'Hudsonville', 'Other'];

function plainTextFromHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const category = getCategory(params.slug);
  const isFree = params.slug === 'free';
  const isMarket = params.slug === 'market';
  const isJobs = params.slug === 'jobs';
  const isHousing = params.slug === 'housing';
  const [authReady, setAuthReady] = useState(false);
  const [subcategory, setSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [city, setCity] = useState('Holland');
  const [rentPriceText, setRentPriceText] = useState('');
  const [depositText, setDepositText] = useState('');
  const [housingType, setHousingType] = useState('1br');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [addressText, setAddressText] = useState('');
  const [availableText, setAvailableText] = useState('');
  const [contactText, setContactText] = useState('');
  const [housingPhotos, setHousingPhotos] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function requireMember() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        const next = `/board/${params.slug}/new`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setAuthReady(true);
    }
    requireMember();
    return () => {
      cancelled = true;
    };
  }, [params.slug, router]);

  async function assertCanWrite() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('글을 쓰려면 로그인이 필요합니다.');
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, banned_reason, suspended_until')
      .eq('id', sessionData.session.user.id)
      .maybeSingle();
    if (profile?.is_banned) {
      throw new Error(profile.banned_reason || '이용이 제한된 계정입니다.');
    }
    if (profile?.suspended_until && new Date(profile.suspended_until).getTime() > Date.now()) {
      throw new Error(`계정이 ${new Date(profile.suspended_until).toLocaleString('ko-KR')}까지 정지되었습니다.`);
    }
    return sessionData.session.user.id;
  }

  async function handleJobsSubmit(fields) {
    setError('');
    setSaving(true);
    try {
      const authorId = await assertCanWrite();
      const payload = {
        title: fields.title,
        body: fields.body,
        city: fields.city,
        category_slug: 'jobs',
        author_id: authorId,
        subcategory: fields.subcategory,
        company_name: fields.companyName || null,
        pay_text: fields.payText || null,
        company_logo: fields.companyLogo || null,
        address_text: fields.addressText || null,
        contact_name: fields.contactName || null,
        contact_phone: fields.contactPhone || null,
        contact_email: fields.contactEmail || null,
        job_roles: fields.jobRoles || null,
        contact_text:
          [fields.contactName, fields.contactPhone, fields.contactEmail].filter(Boolean).join(' · ') ||
          null,
      };

      let { data, error: insertError } = await supabase.from('posts').insert(payload).select('id').single();

      if (insertError) {
        const {
          company_name,
          pay_text,
          company_logo,
          address_text,
          contact_name,
          contact_phone,
          contact_email,
          job_roles,
          contact_text,
          ...basic
        } = payload;
        const retry = await supabase
          .from('posts')
          .insert({
            ...basic,
            company_name,
            pay_text,
            company_logo,
          })
          .select('id')
          .single();
        data = retry.data;
        insertError = retry.error;
        if (!insertError && (address_text || contact_name || contact_phone || contact_email || job_roles)) {
          setError(
            '글은 등록됐지만 연락처/주소/직종 컬럼이 아직 DB에 없습니다. jobs_board_schema.sql을 실행해 주세요.'
          );
        } else if (!insertError && (company_name || pay_text || company_logo)) {
          // ok — core jobs fields present
        } else if (insertError) {
          const bare = await supabase
            .from('posts')
            .insert({
              title: payload.title,
              body: payload.body,
              city: payload.city,
              category_slug: 'jobs',
              author_id: authorId,
              subcategory: payload.subcategory,
            })
            .select('id')
            .single();
          data = bare.data;
          insertError = bare.error;
          if (!insertError) {
            setError('글은 등록됐지만 회사/급여 컬럼이 아직 DB에 없습니다. jobs_board_schema.sql을 실행해 주세요.');
          }
        }
      }

      if (insertError) throw insertError;
      router.push(`/post/${data.id}`);
    } catch (err) {
      setError(err.message || '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isFree && !isValidFreeBoardWriteTag(subcategory)) {
        setError('서브카테고리를 선택해 주세요.');
        return;
      }
      if (isMarket && !isValidMarketTag(subcategory)) {
        setError('구분(팝니다/삽니다 등)을 선택해 주세요.');
        return;
      }
      if (isHousing && !isValidHousingTag(subcategory)) {
        setError('구분(렌트/매매/룸메이트)을 선택해 주세요.');
        return;
      }
      if (
        isMarket &&
        !plainTextFromHtml(body) &&
        !/<img\s/i.test(body)
      ) {
        setError('내용을 입력하거나 사진을 붙여넣어 주세요.');
        return;
      }
      if (
        isHousing &&
        !plainTextFromHtml(body) &&
        !/<img\s/i.test(body) &&
        !(housingPhotos && housingPhotos.length)
      ) {
        setError('상세 설명 또는 매물 사진을 넣어 주세요.');
        return;
      }

      const authorId = await assertCanWrite();

      const payload = {
        title,
        body,
        city,
        category_slug: params.slug,
        author_id: authorId,
      };
      if (isFree) {
        payload.subcategory = subcategory;
        payload.is_featured = subcategory === 'featured';
      }
      if (isMarket) {
        payload.subcategory = subcategory;
      }
      if (isHousing) {
        payload.subcategory = subcategory;
        payload.rent_price_text = rentPriceText.trim() || null;
        payload.deposit_text = depositText.trim() || null;
        payload.housing_type = housingType || null;
        payload.beds = beds.trim() || null;
        payload.baths = baths.trim() || null;
        payload.address_text = addressText.trim() || null;
        payload.available_text = availableText.trim() || null;
        payload.contact_text = contactText.trim() || null;
        payload.image_urls = serializeImageUrls(housingPhotos);
      }

      let { data, error: insertError } = await supabase.from('posts').insert(payload).select('id').single();

      if (insertError && isHousing) {
        const {
          rent_price_text,
          deposit_text,
          housing_type,
          beds: bedsCol,
          baths: bathsCol,
          address_text,
          available_text,
          contact_text,
          image_urls,
          ...basic
        } = payload;
        // Retry without image_urls if that column is missing; keep other housing cols.
        let retryPayload = { ...payload };
        delete retryPayload.image_urls;
        let retry = await supabase.from('posts').insert(retryPayload).select('id').single();
        if (retry.error) {
          retry = await supabase.from('posts').insert(basic).select('id').single();
          if (!retry.error) {
            setError(
              '글은 등록됐지만 부동산 상세 컬럼이 아직 DB에 없습니다. housing_board_schema.sql을 실행해 주세요.'
            );
          }
        } else if (image_urls) {
          setError(
            '글은 등록됐지만 image_urls 컬럼이 없습니다. housing_board_schema.sql을 실행하면 사진 갤러리가 저장됩니다. 본문 사진으로도 표시됩니다.'
          );
          // Embed photos into body so gallery can still find them via extractImageSrcs
          if (housingPhotos?.length) {
            const imgs = housingPhotos
              .map((src) => `<p><img src="${src}" alt="" class="market-inline-image" /></p>`)
              .join('');
            await supabase
              .from('posts')
              .update({ body: `${imgs}${body || ''}` })
              .eq('id', retry.data.id);
          }
        }
        data = retry.data;
        insertError = retry.error;
      }
      if (insertError) throw insertError;
      router.push(`/post/${data.id}`);
    } catch (err) {
      setError(err.message || '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (!category) {
    return (
      <div className="container">
        <div className="card empty-state">존재하지 않는 게시판입니다.</div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="container">
        <div className="card empty-state">로그인 확인 중…</div>
      </div>
    );
  }

  if (isJobs) {
    return (
      <div className="container">
        <JobsComposeForm
          cities={CITIES}
          saving={saving}
          error={error}
          listHref="/board/jobs"
          onSubmit={handleJobsSubmit}
        />
      </div>
    );
  }

  const writeTags = isMarket
    ? MARKET_TAGS
    : isHousing
      ? HOUSING_TAGS.filter((t) => t.slug !== 'done')
      : isFree
        ? FREE_BOARD_WRITE_TAGS
        : null;
  const needsSubcategory = isFree || isMarket || isHousing;

  return (
    <div className="container">
      <div className="row-between">
        <h2 className="section-title">{category.nameKo} 글쓰기</h2>
        <Link href={`/board/${params.slug}`} className="btn btn-outline">
          목록
        </Link>
      </div>
      <form className="card form-card form-card--wide" onSubmit={handleSubmit}>
        {writeTags ? (
          <fieldset className="free-subcat-fieldset">
            <legend>
              구분 <span className="required-mark">필수</span>
            </legend>
            <p className="hint-text free-subcat-hint">
              {isMarket
                ? '팝니다 / 삽니다 / 무료나눔 / 완료 중 하나를 선택하세요.'
                : isHousing
                  ? '렌트 / 매매 / 룸메이트 중 하나를 선택하세요.'
                  : '글을 쓰기 전에 주제를 먼저 선택해 주세요.'}
            </p>
            <div className="free-subcat-options" role="radiogroup" aria-label="구분">
              {writeTags.map((tag) => {
                const selected = subcategory === tag.slug;
                return (
                  <label
                    key={tag.slug}
                    className={`free-subcat-option${selected ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="subcategory"
                      value={tag.slug}
                      checked={selected}
                      onChange={() => setSubcategory(tag.slug)}
                      required
                    />
                    <span>{tag.nameKo}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {isHousing ? (
          <>
            <label htmlFor="housingType">매물 유형</label>
            <select id="housingType" value={housingType} onChange={(e) => setHousingType(e.target.value)}>
              {HOUSING_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.nameKo}
                </option>
              ))}
            </select>
            <div className="housing-form-grid">
              <div>
                <label htmlFor="rentPriceText">월세/가격</label>
                <input
                  id="rentPriceText"
                  value={rentPriceText}
                  onChange={(e) => setRentPriceText(e.target.value)}
                  placeholder="예: $1,200/mo · $285,000"
                />
              </div>
              <div>
                <label htmlFor="depositText">보증금/디파짓</label>
                <input
                  id="depositText"
                  value={depositText}
                  onChange={(e) => setDepositText(e.target.value)}
                  placeholder="예: 1개월 · $1,200"
                />
              </div>
              <div>
                <label htmlFor="beds">침실</label>
                <input id="beds" value={beds} onChange={(e) => setBeds(e.target.value)} placeholder="예: 2" />
              </div>
              <div>
                <label htmlFor="baths">욕실</label>
                <input id="baths" value={baths} onChange={(e) => setBaths(e.target.value)} placeholder="예: 1.5" />
              </div>
            </div>
            <label htmlFor="addressText">주소/위치</label>
            <input
              id="addressText"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="예: 123 Main St, Holland, MI"
            />
            <label htmlFor="availableText">입주 가능일</label>
            <input
              id="availableText"
              value={availableText}
              onChange={(e) => setAvailableText(e.target.value)}
              placeholder="예: 즉시 · 9/1부터"
            />
            <label htmlFor="contactText">연락처</label>
            <input
              id="contactText"
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              placeholder="휴대폰 / 카톡 / 이메일"
            />
            <label>매물 사진</label>
            <HousingPhotosField
              value={housingPhotos}
              onChange={setHousingPhotos}
              disabled={saving}
            />
          </>
        ) : null}

        <label htmlFor="title">{isHousing ? '매물 제목' : '제목'}</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isHousing ? '예: Holland 2BR 렌트 · No fee' : undefined}
          required
        />
        <label htmlFor="city">지역</label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor={isMarket || isHousing ? undefined : 'body'}>
          {isHousing ? '상세 설명' : '내용'}
        </label>
        {isMarket || isHousing ? (
          <MarketBodyEditor
            value={body}
            onChange={setBody}
            disabled={saving}
            showUploadButton={isHousing}
            ariaLabel={isHousing ? '부동산 상세 설명' : '본문'}
            helpText={
              isHousing
                ? '위 매물 사진에 올린 이미지는 갤러리로 보입니다. 본문에도 추가 사진을 넣을 수 있습니다.'
                : undefined
            }
          />
        ) : (
          <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} required />
        )}

        {error ? <div className="error-text">{error}</div> : null}
        <button
          className="btn"
          type="submit"
          disabled={saving || (needsSubcategory && !subcategory)}
        >
          {saving ? '등록 중…' : '등록'}
        </button>
      </form>
    </div>
  );
}
