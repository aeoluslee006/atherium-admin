import Link from 'next/link';
import { MARKET_TAGS, getMarketTagLabel, isValidMarketTag } from '../lib/marketTags';
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
  if (!tag || tag === 'all') return '/board/market';
  return `/board/market?tag=${encodeURIComponent(tag)}`;
}

function hasInlineImage(body) {
  if (!body) return false;
  return /<img\s/i.test(body) || /data:image\//i.test(body) || /!\[[^\]]*]\(/i.test(body);
}

export default async function MarketBoardPage({ searchParams = {} }) {
  const rawTag = searchParams.tag || 'all';
  const tag = isValidMarketTag(rawTag) ? rawTag : 'all';

  let posts = [];
  let authorsById = {};

  try {
    let path =
      'posts?select=id,title,body,subcategory,is_pinned,created_at,author_id,view_count&category_slug=eq.market';
    if (tag !== 'all') {
      path += `&subcategory=eq.${encodeURIComponent(tag)}`;
    }
    path += '&order=is_pinned.desc,created_at.desc';

    try {
      posts = await supabaseRest(path);
    } catch {
      // view_count may be missing before SQL migration
      let fallback =
        'posts?select=id,title,body,subcategory,is_pinned,created_at,author_id&category_slug=eq.market';
      if (tag !== 'all') {
        fallback += `&subcategory=eq.${encodeURIComponent(tag)}`;
      }
      fallback += '&order=is_pinned.desc,created_at.desc';
      posts = await supabaseRest(fallback);
    }

    const authorIds = [...new Set((posts || []).map((p) => p.author_id).filter(Boolean))];
    if (authorIds.length) {
      try {
        const profiles = await supabaseRest(
          `profiles?select=id,username,display_name&id=in.(${authorIds.map(encodeURIComponent).join(',')})`
        );
        authorsById = Object.fromEntries(
          (profiles || []).map((p) => [p.id, p.username || p.display_name || ''])
        );
      } catch {
        authorsById = {};
      }
    }
  } catch {
    posts = [];
  }

  return (
    <div className="container">
      <header className="market-board-head">
        <h2 className="section-title">중고장터</h2>
      </header>

      <div className="board-toolbar market-toolbar">
        <div className="tag-chips" role="list" aria-label="중고장터 필터">
          <Link
            href={buildHref('all')}
            role="listitem"
            className={`free-board-chip${tag === 'all' ? ' is-active' : ''}`}
          >
            전체
          </Link>
          {MARKET_TAGS.map((t) => (
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
        <Link href="/board/market/new" className="btn">
          글쓰기
        </Link>
      </div>

      <div className="wf-box market-board">
        <div className="market-board-meta">
          Total {(posts || []).length}건
        </div>

        <div className="market-table" role="table" aria-label="중고장터 목록">
          <div className="market-table-head" role="row">
            <span role="columnheader">구분</span>
            <span role="columnheader">제목</span>
            <span role="columnheader">글쓴이</span>
            <span role="columnheader">조회</span>
            <span role="columnheader">날짜</span>
          </div>

          {(posts || []).length ? (
            posts.map((post) => {
              const label = post.is_pinned ? '공지' : getMarketTagLabel(post.subcategory) || '일반';
              const author = authorsById[post.author_id] || '—';
              const views = Number.isFinite(post.view_count) ? post.view_count : 0;
              const img = hasInlineImage(post.body);
              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className={`market-table-row${post.is_pinned ? ' is-notice' : ''}`}
                  role="row"
                >
                  <span className="market-col-badge" role="cell">
                    <span className={`market-badge market-badge--${post.subcategory || 'plain'}${post.is_pinned ? ' market-badge--notice' : ''}`}>
                      {label}
                    </span>
                  </span>
                  <span className="market-col-title" role="cell">
                    <span className="market-title-text">{post.title}</span>
                    {img ? (
                      <span className="market-img-mark" title="사진 있음" aria-label="사진 있음">
                        ▤
                      </span>
                    ) : null}
                  </span>
                  <span className="market-col-author" role="cell">
                    {author}
                  </span>
                  <span className="market-col-views" role="cell">
                    {views}
                  </span>
                  <span className="market-col-date" role="cell">
                    {formatListDate(post.created_at)}
                  </span>
                </Link>
              );
            })
          ) : (
            <div className="empty-state">아직 중고장터 글이 없습니다. 첫 글을 남겨보세요!</div>
          )}
        </div>
      </div>
    </div>
  );
}
