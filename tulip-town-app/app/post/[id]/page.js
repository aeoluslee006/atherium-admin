import Link from 'next/link';
import CommentForm from '../../../components/CommentForm';
import { getCategory } from '../../../lib/categories';
import { getFreeBoardTagLabel } from '../../../lib/freeBoardTags';
import { getMarketTagLabel } from '../../../lib/marketTags';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

function isHtmlBody(body) {
  return /<\/?[a-z][\s\S]*>/i.test(String(body || ''));
}

function sanitizePostHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function formatPostDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return '';
  }
}

async function safeRest(path) {
  try {
    return await supabaseRest(path);
  } catch {
    return [];
  }
}

export default async function PostPage({ params }) {
  let post = null;
  let comments = [];
  let authorLabel = '';
  let prevPost = null;
  let nextPost = null;

  try {
    const rows = await supabaseRest(
      `posts?select=*&id=eq.${encodeURIComponent(params.id)}&limit=1`
    );
    post = rows?.[0] || null;
    if (post) {
      comments = await safeRest(
        `comments?select=*&post_id=eq.${encodeURIComponent(params.id)}&order=created_at.asc`
      );
      if (post.author_id) {
        const authors = await safeRest(
          `profiles?select=username,display_name&id=eq.${encodeURIComponent(post.author_id)}&limit=1`
        );
        const author = authors?.[0];
        authorLabel = author?.username || author?.display_name || '';
      }

      // Best-effort view increment (requires market_board_schema.sql)
      try {
        const nextCount = await supabaseRest('rpc/increment_post_views', {
          method: 'POST',
          body: JSON.stringify({ p_id: post.id }),
        });
        if (typeof nextCount === 'number') {
          post.view_count = nextCount;
        }
      } catch {
        // ignore until SQL is applied
      }

      if (post.category_slug === 'market' && post.created_at) {
        const newer = await safeRest(
          `posts?select=id,title,created_at&category_slug=eq.market&created_at=gt.${encodeURIComponent(
            post.created_at
          )}&order=created_at.asc&limit=1`
        );
        const older = await safeRest(
          `posts?select=id,title,created_at&category_slug=eq.market&created_at=lt.${encodeURIComponent(
            post.created_at
          )}&order=created_at.desc&limit=1`
        );
        nextPost = newer?.[0] || null;
        prevPost = older?.[0] || null;
      }
    }
  } catch {
    post = null;
  }

  if (!post) {
    return (
      <div className="container">
        <div className="card empty-state">게시글을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const category = getCategory(post.category_slug);
  const isMarket = post.category_slug === 'market';
  const freeTagLabel = post.category_slug === 'free' ? getFreeBoardTagLabel(post.subcategory) : '';
  const marketTagLabel = isMarket ? getMarketTagLabel(post.subcategory) : '';
  const htmlBody = isHtmlBody(post.body);

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <div className="hint-text" style={{ marginBottom: 6 }}>
            {category ? (
              <Link href={`/board/${category.slug}`}>
                {isMarket ? category.nameKo : `${category.nameKo} · ${category.nameEn}`}
              </Link>
            ) : (
              post.category_slug
            )}
          </div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
            {freeTagLabel ? <span className="subcat-badge">{freeTagLabel}</span> : null}
            {marketTagLabel ? (
              <span className={`market-badge market-badge--${post.subcategory}`}>{marketTagLabel}</span>
            ) : null}{' '}
            {post.title}
          </h2>
          <div className="hint-text post-meta-bar">
            {authorLabel ? <span className="post-author">{authorLabel}</span> : null}
            {typeof post.view_count === 'number' ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>조회 {post.view_count}</span>
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            <span>댓글 {comments?.length || 0}</span>
            {post.city ? (
              <>
                <span aria-hidden="true"> · </span>
                <span className="city-tag">{post.city}</span>
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            <span>{formatPostDate(post.created_at)}</span>
          </div>
        </div>
        {category ? (
          <Link href={`/board/${category.slug}`} className="btn btn-outline">
            목록
          </Link>
        ) : null}
      </div>

      {htmlBody ? (
        <div
          className="card post-body-html"
          style={{ marginBottom: 24 }}
          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.body) }}
        />
      ) : (
        <div className="card" style={{ whiteSpace: 'pre-wrap', marginBottom: 24 }}>
          {post.body}
        </div>
      )}

      {isMarket && (prevPost || nextPost) ? (
        <div className="card market-adjacent">
          {prevPost ? (
            <Link href={`/post/${prevPost.id}`} className="market-adjacent-row">
              <span className="market-adjacent-label">이전글</span>
              <span className="market-adjacent-title">{prevPost.title}</span>
            </Link>
          ) : null}
          {nextPost ? (
            <Link href={`/post/${nextPost.id}`} className="market-adjacent-row">
              <span className="market-adjacent-label">다음글</span>
              <span className="market-adjacent-title">{nextPost.title}</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <h3 className="section-title">댓글 · Comments</h3>
      <div className="card">
        {comments?.length ? (
          comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="comment-meta">
                {c.created_at ? new Date(c.created_at).toLocaleString('ko-KR') : ''}
              </div>
              <div>{c.body}</div>
            </div>
          ))
        ) : (
          <div className="empty-state">아직 댓글이 없습니다.</div>
        )}
        <CommentForm postId={post.id} />
      </div>
    </div>
  );
}
