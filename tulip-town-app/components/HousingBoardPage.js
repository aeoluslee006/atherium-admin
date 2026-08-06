import Link from 'next/link';
import {
  HOUSING_TAGS,
  getHousingTagLabel,
  getHousingTypeLabel,
  isValidHousingTag,
} from '../lib/housingTags';
import { supabaseRest } from '../lib/supabaseRest';

function formatListDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  } catch {
    return '';
  }
}

function buildHref(tag) {
  if (!tag || tag === 'all') return '/board/housing';
  return `/board/housing?tag=${encodeURIComponent(tag)}`;
}

function roomLabel(post) {
  const parts = [];
  if (post.housing_type) parts.push(getHousingTypeLabel(post.housing_type) || post.housing_type);
  if (post.beds) parts.push(`${post.beds}bed`);
  if (post.baths) parts.push(`${post.baths}ba`);
  return parts.join(' · ');
}

export default async function HousingBoardPage({ searchParams = {} }) {
  const rawTag = searchParams.tag || 'all';
  const tag = isValidHousingTag(rawTag) ? rawTag : 'all';

  let posts = [];

  try {
    let path =
      'posts?select=id,title,subcategory,is_pinned,created_at,city,view_count,rent_price_text,deposit_text,housing_type,beds,baths,address_text,available_text&category_slug=eq.housing';
    if (tag !== 'all') path += `&subcategory=eq.${encodeURIComponent(tag)}`;
    path += '&order=is_pinned.desc,created_at.desc';

    try {
      posts = await supabaseRest(path);
    } catch {
      let fallback =
        'posts?select=id,title,subcategory,is_pinned,created_at,city&category_slug=eq.housing';
      if (tag !== 'all') fallback += `&subcategory=eq.${encodeURIComponent(tag)}`;
      fallback += '&order=is_pinned.desc,created_at.desc';
      posts = await supabaseRest(fallback);
    }
  } catch {
    posts = [];
  }

  return (
    <div className="container">
      <header className="housing-board-head board-heading">
        <h2 className="section-title">렌트/부동산</h2>
        <p className="board-heading-desc">렌트 · 매매 · 룸메이트</p>
      </header>

      <div className="board-toolbar housing-toolbar">
        <div className="tag-chips" role="list" aria-label="부동산 필터">
          <Link
            href={buildHref('all')}
            role="listitem"
            className={`free-board-chip${tag === 'all' ? ' is-active' : ''}`}
          >
            전체
          </Link>
          {HOUSING_TAGS.map((t) => (
            <Link
              key={t.slug}
              href={buildHref(t.slug)}
              role="listitem"
              className={`free-board-chip${tag === t.slug ? ' is-active' : ''}`}
            >
              {t.nameKo}
            </Link>
          ))}
        </div>
        <Link href="/board/housing/new" className="btn">
          글쓰기
        </Link>
      </div>

      <div className="wf-box housing-board">
        <div className="housing-board-meta">Total {(posts || []).length}건 · 목록은 텍스트만 (사진 없음)</div>

        <div className="housing-table" role="table" aria-label="렌트/부동산 목록">
          <div className="housing-table-head" role="row">
            <span role="columnheader">구분</span>
            <span role="columnheader">제목 / 요약</span>
            <span role="columnheader">가격</span>
            <span role="columnheader">지역</span>
            <span role="columnheader">날짜</span>
          </div>

          {(posts || []).length ? (
            posts.map((post) => {
              const label = getHousingTagLabel(post.subcategory) || '기타';
              const rooms = roomLabel(post);
              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className={`housing-row${post.subcategory === 'done' ? ' is-done' : ''}`}
                  role="row"
                >
                  <span className="housing-row-type" role="cell">
                    <span className={`housing-badge housing-badge--${post.subcategory || 'rent'}`}>
                      {label}
                    </span>
                  </span>
                  <span className="housing-row-main" role="cell">
                    <span className="housing-row-title">
                      {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
                      {post.title}
                    </span>
                    <span className="housing-row-sub">
                      {[rooms, post.address_text || post.available_text].filter(Boolean).join(' · ') ||
                        '상세 보기'}
                    </span>
                  </span>
                  <span className="housing-row-price" role="cell">
                    {post.rent_price_text || '—'}
                  </span>
                  <span className="housing-row-city" role="cell">
                    {post.city || '—'}
                  </span>
                  <span className="housing-row-date" role="cell">
                    {formatListDate(post.created_at)}
                  </span>
                </Link>
              );
            })
          ) : (
            <div className="empty-state housing-empty">아직 매물이 없습니다. 첫 글을 남겨보세요!</div>
          )}
        </div>
      </div>
    </div>
  );
}
