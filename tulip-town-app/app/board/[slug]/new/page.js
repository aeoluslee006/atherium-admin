'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MarketBodyEditor from '../../../../components/MarketBodyEditor';
import { getCategory } from '../../../../lib/categories';
import { FREE_BOARD_WRITE_TAGS, isValidFreeBoardWriteTag } from '../../../../lib/freeBoardTags';
import { MARKET_TAGS, isValidMarketTag } from '../../../../lib/marketTags';
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
  const [authReady, setAuthReady] = useState(false);
  const [subcategory, setSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [city, setCity] = useState('Holland');
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
      if (isMarket && !plainTextFromHtml(body) && !/<img\s/i.test(body)) {
        setError('내용을 입력하거나 사진을 붙여넣어 주세요.');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('글을 쓰려면 로그인이 필요합니다.');
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

      const payload = {
        title,
        body,
        city,
        category_slug: params.slug,
        author_id: sessionData.session.user.id,
      };
      if (isFree) {
        payload.subcategory = subcategory;
        payload.is_featured = subcategory === 'featured';
      }
      if (isMarket) {
        payload.subcategory = subcategory;
      }

      const { data, error: insertError } = await supabase
        .from('posts')
        .insert(payload)
        .select('id')
        .single();
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

  const writeTags = isMarket ? MARKET_TAGS : isFree ? FREE_BOARD_WRITE_TAGS : null;
  const needsSubcategory = isFree || isMarket;

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
              {isMarket ? '구분' : '서브카테고리'} <span className="required-mark">필수</span>
            </legend>
            <p className="hint-text free-subcat-hint">
              {isMarket ? '팝니다 / 삽니다 / 무료나눔 / 완료 중 하나를 선택하세요.' : '글을 쓰기 전에 주제를 먼저 선택해 주세요.'}
            </p>
            <div className="free-subcat-options" role="radiogroup" aria-label={isMarket ? '구분' : '서브카테고리'}>
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

        <label htmlFor="title">제목</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label htmlFor="city">지역</label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor={isMarket ? undefined : 'body'}>내용</label>
        {isMarket ? (
          <MarketBodyEditor value={body} onChange={setBody} disabled={saving} />
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
