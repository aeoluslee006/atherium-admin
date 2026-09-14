'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import JobsComposeForm from '../../../../components/JobsComposeForm';
import HousingPhotosField from '../../../../components/HousingPhotosField';
import MarketBodyEditor from '../../../../components/MarketBodyEditor';
import { getCategory } from '../../../../lib/categories';
import { FREE_BOARD_WRITE_TAGS, isValidFreeBoardWriteTag } from '../../../../lib/freeBoardTags';
import { HOUSING_TAGS, HOUSING_TYPES, isValidHousingTag } from '../../../../lib/housingTags';
import { MARKET_TAGS, isValidMarketTag } from '../../../../lib/marketTags';
import { serializeImageUrls } from '../../../../lib/postImages';
import { requestPostTranslation } from '../../../../lib/i18n/postLocale';
import { useLocale } from '../../../../components/LocaleProvider';
import { SETTLEMENT_CITY_NAMES, isValidSettlementCity } from '../../../../lib/settlementTowns';
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

function tagLabel(tagItem, locale) {
  if (!tagItem) return '';
  return locale === 'en' ? tagItem.nameEn || tagItem.nameKo : tagItem.nameKo;
}

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const category = getCategory(params.slug);
  const isFree = params.slug === 'free';
  const isMarket = params.slug === 'market';
  const isJobs = params.slug === 'jobs';
  const isGuide = params.slug === 'guide';
  const cityOptions = isGuide ? SETTLEMENT_CITY_NAMES : CITIES;
  const isHousing = params.slug === 'housing';
  const isClasses = params.slug === 'classes';
  const [authReady, setAuthReady] = useState(false);
  const [subcategory, setSubcategory] = useState('');
  const [showOnDashboard, setShowOnDashboard] = useState(false);
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
  const [marketPriceText, setMarketPriceText] = useState('');
  const [marketPhotos, setMarketPhotos] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fromMap = searchParams.get('city');
    if (isGuide && fromMap && isValidSettlementCity(fromMap)) {
      setCity(fromMap);
    }
  }, [isGuide, searchParams]);

  useEffect(() => {
    if (params.slug === 'clubs') {
      router.replace('/board/classes/new');
      return;
    }
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
      throw new Error(t('compose.needLogin'));
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, banned_reason, suspended_until')
      .eq('id', sessionData.session.user.id)
      .maybeSingle();
    if (profile?.is_banned) {
      throw new Error(profile.banned_reason || t('compose.accountBanned'));
    }
    if (profile?.suspended_until && new Date(profile.suspended_until).getTime() > Date.now()) {
      const until = new Date(profile.suspended_until).toLocaleString(
        locale === 'en' ? 'en-US' : 'ko-KR'
      );
      throw new Error(t('compose.accountSuspended', { date: until }));
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
      requestPostTranslation(data.id, { wait: false });
      router.push(`/post/${data.id}`);
    } catch (err) {
      setError(err.message || t('compose.fail'));
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
        setError(t('compose.needSubcat'));
        return;
      }
      if (isMarket && !isValidMarketTag(subcategory)) {
        setError(t('compose.needMarketType'));
        return;
      }
      if (isHousing && !isValidHousingTag(subcategory)) {
        setError(t('compose.needHousingType'));
        return;
      }
      if (
        isMarket &&
        !plainTextFromHtml(body) &&
        !/<img\s/i.test(body) &&
        !(marketPhotos && marketPhotos.length)
      ) {
        setError(t('compose.needMarketBody'));
        return;
      }
      if (
        isHousing &&
        !plainTextFromHtml(body) &&
        !/<img\s/i.test(body) &&
        !(housingPhotos && housingPhotos.length)
      ) {
        setError(t('compose.needHousingBody'));
        return;
      }
      if (isGuide && !isValidSettlementCity(city)) {
        setError(t('compose.needCity'));
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
        // 좋은글 board list vs home dashboard: many featured posts, only checked ones on home.
        payload.is_featured = subcategory === 'featured' && showOnDashboard;
      }
      if (isMarket) {
        payload.subcategory = subcategory;
        payload.price_text = marketPriceText.trim() || null;
        payload.contact_text = contactText.trim() || null;
        payload.image_urls = serializeImageUrls(marketPhotos);
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
      if (isClasses) {
        payload.address_text = addressText.trim() || null;
        payload.contact_text = contactText.trim() || null;
      }

      let { data, error: insertError } = await supabase.from('posts').insert(payload).select('id').single();

      if (insertError && isMarket) {
        const { price_text, contact_text, image_urls, ...basic } = payload;
        let retry = await supabase
          .from('posts')
          .insert({ ...basic, price_text, contact_text })
          .select('id')
          .single();
        if (retry.error) {
          retry = await supabase.from('posts').insert(basic).select('id').single();
        }
        if (!retry.error && image_urls && marketPhotos?.length) {
          const imgs = marketPhotos
            .map((src) => `<p><img src="${src}" alt="" class="market-inline-image" /></p>`)
            .join('');
          await supabase
            .from('posts')
            .update({ body: `${imgs}${body || ''}` })
            .eq('id', retry.data.id);
          setError(
            '글은 등록됐습니다. 사진 갤러리 컬럼이 없으면 본문에 사진을 넣었습니다. market_board_schema.sql을 실행해 주세요.'
          );
        } else if (!retry.error && (price_text || contact_text || image_urls)) {
          setError('글은 등록됐지만 일부 컬럼이 없습니다. market_board_schema.sql을 실행해 주세요.');
        }
        data = retry.data;
        insertError = retry.error;
      }
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
      if (insertError && isClasses) {
        const { address_text, contact_text, ...basic } = payload;
        const retry = await supabase.from('posts').insert(basic).select('id').single();
        if (!retry.error && (address_text || contact_text)) {
          setError('글은 등록됐지만 일부 컬럼이 없습니다. classes_board_schema.sql을 실행해 주세요.');
        }
        data = retry.data;
        insertError = retry.error;
      }
      if (insertError) throw insertError;
      requestPostTranslation(data.id, { wait: false });
      router.push(`/post/${data.id}`);
    } catch (err) {
      setError(err.message || t('compose.fail'));
    } finally {
      setSaving(false);
    }
  }

  if (!category) {
    return (
      <div className="container">
        <div className="card empty-state">{t('board.notFound')}</div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="container">
        <div className="card empty-state">{t('auth.loading')}</div>
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
      ? HOUSING_TAGS.filter((tagItem) => tagItem.slug !== 'done')
      : isFree
        ? FREE_BOARD_WRITE_TAGS
        : null;
  const needsSubcategory = isFree || isMarket || isHousing;
  const isFeaturedWrite = isFree && subcategory === 'featured';
  const categoryName = locale === 'en' ? category.nameEn || category.nameKo : category.nameKo;

  return (
    <div className="container">
      <div className="row-between">
        <h2 className="section-title">{t('board.writeTitle', { name: categoryName })}</h2>
        <Link href={`/board/${params.slug}`} className="btn btn-outline">
          {t('board.list')}
        </Link>
      </div>
      <form className="card form-card form-card--wide" onSubmit={handleSubmit}>
        {writeTags ? (
          <fieldset className="free-subcat-fieldset">
            <legend>
              {t('compose.subcategory')} <span className="required-mark">{t('common.required')}</span>
            </legend>
            <p className="hint-text free-subcat-hint">
              {isMarket
                ? t('compose.pickMarket')
                : isHousing
                  ? t('compose.pickHousing')
                  : t('compose.pickTopic')}
            </p>
            <div className="free-subcat-options" role="radiogroup" aria-label={t('compose.subcategory')}>
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
                      onChange={() => {
                        setSubcategory(tag.slug);
                        if (tag.slug !== 'featured') {
                          setShowOnDashboard(false);
                        }
                      }}
                      required
                    />
                    <span>{tagLabel(tag, locale)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {isFeaturedWrite ? (
          <label className="dashboard-feature-toggle">
            <input
              type="checkbox"
              checked={showOnDashboard}
              onChange={(e) => setShowOnDashboard(e.target.checked)}
              disabled={saving}
            />
            <span>
              {t('compose.featureHome')}
              <em className="dashboard-feature-hint">{t('compose.featureHint')}</em>
            </span>
          </label>
        ) : null}

        {isHousing ? (
          <>
            <label htmlFor="housingType">{t('compose.housingType')}</label>
            <select id="housingType" value={housingType} onChange={(e) => setHousingType(e.target.value)}>
              {HOUSING_TYPES.map((typeItem) => (
                <option key={typeItem.slug} value={typeItem.slug}>
                  {tagLabel(typeItem, locale)}
                </option>
              ))}
            </select>
            <div className="housing-form-grid">
              <div>
                <label htmlFor="rentPriceText">{t('compose.rentPrice')}</label>
                <input
                  id="rentPriceText"
                  value={rentPriceText}
                  onChange={(e) => setRentPriceText(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="depositText">{t('compose.deposit')}</label>
                <input
                  id="depositText"
                  value={depositText}
                  onChange={(e) => setDepositText(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="beds">{t('compose.beds')}</label>
                <input id="beds" value={beds} onChange={(e) => setBeds(e.target.value)} />
              </div>
              <div>
                <label htmlFor="baths">{t('compose.baths')}</label>
                <input id="baths" value={baths} onChange={(e) => setBaths(e.target.value)} />
              </div>
            </div>
            <label htmlFor="addressText">{t('compose.address')}</label>
            <input
              id="addressText"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
            />
            <label htmlFor="availableText">{t('compose.available')}</label>
            <input
              id="availableText"
              value={availableText}
              onChange={(e) => setAvailableText(e.target.value)}
            />
            <label htmlFor="contactText">{t('compose.contact')}</label>
            <input
              id="contactText"
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
            />
            <label>{t('compose.housingPhotos')}</label>
            <HousingPhotosField
              value={housingPhotos}
              onChange={setHousingPhotos}
              disabled={saving}
            />
          </>
        ) : null}

        {isMarket ? (
          <>
            <label htmlFor="marketPriceText">{t('compose.price')}</label>
            <input
              id="marketPriceText"
              value={marketPriceText}
              onChange={(e) => setMarketPriceText(e.target.value)}
            />
            <label htmlFor="marketContactText">{t('compose.contact')}</label>
            <input
              id="marketContactText"
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
            />
            <label>{t('compose.itemPhotos')}</label>
            <HousingPhotosField
              value={marketPhotos}
              onChange={setMarketPhotos}
              disabled={saving}
            />
          </>
        ) : null}

        <label htmlFor="title">
          {isHousing
            ? t('compose.listingTitle')
            : isMarket
              ? t('compose.itemTitle')
              : isClasses
                ? t('compose.classTitle')
                : t('compose.title')}
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <label htmlFor="city">{t('compose.city')}</label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)} required>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {isGuide ? <p className="hint-text">{t('compose.guideCityHint')}</p> : null}

        {isClasses ? (
          <>
            <label htmlFor="classesAddressText">{t('compose.classVenue')}</label>
            <input
              id="classesAddressText"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
            />
            <label htmlFor="classesContactText">{t('compose.contact')}</label>
            <input
              id="classesContactText"
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
            />
          </>
        ) : null}

        <label htmlFor={isMarket || isHousing ? undefined : 'body'}>
          {isHousing || isMarket ? t('compose.detail') : t('compose.body')}
        </label>
        {isMarket || isHousing ? (
          <MarketBodyEditor
            value={body}
            onChange={setBody}
            disabled={saving}
            showUploadButton
            ariaLabel={
              isHousing
                ? t('compose.housingBodyAria')
                : isMarket
                  ? t('compose.marketBodyAria')
                  : t('compose.body')
            }
            helpText={isHousing || isMarket ? t('compose.bodyHelp') : undefined}
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
          {saving ? t('compose.submitting') : t('common.submit')}
        </button>
      </form>
    </div>
  );
}
