import Link from 'next/link';
import { MARKET_TAGS, getMarketTagLabel, isValidMarketTag } from '../lib/marketTags';
import { collectPostImages } from '../lib/postImages';
import { getSampleMarketPost, SAMPLE_MARKET_POST_ID } from '../lib/sampleMarketPost';
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

export default async function MarketBoardPage({ searchParams = {} }) {
  const rawTag = searchParams.tag || 'all';
  const tag = isValidMarketTag(rawTag) ? rawTag : 'all';

  let posts = [];

  try {
    let path =
      'posts?select=id,title,body,subcategory,is_pinned,created_at,city,view_count,price_text,image_urls&category_slug=eq.market';
    if (tag !== 'all') path += `&subcategory=eq.${encodeURIComponent(tag)}`;
    path += '&order=is_pinned.desc,created_at.desc';

    try {
      posts = await supabaseRest(path);
    } catch {
      try {
        let mid =
          'posts?select=id,title,body,subcategory,is_pinned,created_at,city,view_count&category_slug=eq.market';
        if (tag !== 'all') mid += `&subcategory=eq.${encodeURIComponent(tag)}`;
        mid += '&order=is_pinned.desc,created_at.desc';
        posts = await supabaseRest(mid);
      } catch {
        let fallback =
          'posts?select=id,title,body,subcategory,is_pinned,created_at,city&category_slug=eq.market';
        if (tag !== 'all') fallback += `&subcategory=eq.${encodeURIComponent(tag)}`;
        fallback += '&order=is_pinned.desc,created_at.desc';
        posts = await supabaseRest(fallback);
      }
    }
  } catch {
    posts = [];
  }

  if (!Array.isArray(posts)) posts = [];
  const hasReal = posts.some((p) => p?.id && p.id !== SAMPLE_MARKET_POST_ID);
  if (!hasReal && (tag === 'all' || tag === 'sell')) {
    posts = [getSampleMarketPost(), ...posts];
  }

  return (
    <div className="container">
      <header className="market-board-head board-heading">
        <h2 className="section-title">중고장터</h2>
        <p className="board-heading-desc">팝니다 · 삽니다 · 무료나눔</p>
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
          Total {(posts || []).length}건 · 사진은 상세에서 갤러리로 확인
        </div>

        <div className="market-table market-table--photos" role="table" aria-label="중고장터 목록">
          <div className="market-table-head market-table-head--photos" role="row">
            <span role="columnheader">사진</span>
            <span role="columnheader">구분</span>
            <span role="columnheader">제목</span>
            <span role="columnheader">가격</span>
            <span role="columnheader">지역</span>
            <span role="columnheader">날짜</span>
          </div>

          {(posts || []).length ? (
            posts.map((post) => {
              const label = post.is_pinned ? '공지' : getMarketTagLabel(post.subcategory) || '일반';
              const photos = collectPostImages(post);
              const cover = photos[0] || null;
              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className={`market-table-row market-table-row--photos${post.is_pinned ? ' is-notice' : ''}${post.subcategory === 'done' ? ' is-done' : ''}`}
                  role="row"
                >
                  <span className="market-row-thumb" role="cell">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" />
                    ) : (
                      <span className="market-row-thumb-empty" aria-hidden="true">
                        —
                      </span>
                    )}
                    {photos.length > 1 ? (
                      <span className="market-row-photo-count">{photos.length}</span>
                    ) : null}
                  </span>
                  <span className="market-col-badge" role="cell">
                    <span
                      className={`market-badge market-badge--${post.subcategory || 'plain'}${post.is_pinned ? ' market-badge--notice' : ''}`}
                    >
                      {label}
                    </span>
                  </span>
                  <span className="market-col-title" role="cell">
                    <span className="market-title-text">{post.title}</span>
                  </span>
                  <span className="market-col-price" role="cell">
                    {post.price_text || '—'}
                  </span>
                  <span className="market-col-city" role="cell">
                    {post.city || '—'}
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
