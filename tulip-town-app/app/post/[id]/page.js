import Link from 'next/link';
import CommentForm from '../../../components/CommentForm';
import { getCategory } from '../../../lib/categories';
import { getFreeBoardTagLabel } from '../../../lib/freeBoardTags';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export default async function PostPage({ params }) {
  let post = null;
  let comments = [];
  let authorLabel = '';
  try {
    const rows = await supabaseRest(
      `posts?select=*&id=eq.${encodeURIComponent(params.id)}&limit=1`
    );
    post = rows?.[0] || null;
    if (post) {
      comments = await supabaseRest(
        `comments?select=*&post_id=eq.${encodeURIComponent(params.id)}&order=created_at.asc`
      );
      if (post.author_id) {
        try {
          const authors = await supabaseRest(
            `profiles?select=username,display_name&id=eq.${encodeURIComponent(post.author_id)}&limit=1`
          );
          const author = authors?.[0];
          authorLabel = author?.username || author?.display_name || '';
        } catch {
          authorLabel = '';
        }
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
  const freeTagLabel =
    post.category_slug === 'free' ? getFreeBoardTagLabel(post.subcategory) : '';

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <div className="hint-text" style={{ marginBottom: 6 }}>
            {category ? (
              <Link href={`/board/${category.slug}`}>
                {category.nameKo} · {category.nameEn}
              </Link>
            ) : (
              post.category_slug
            )}
          </div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
            {freeTagLabel ? <span className="subcat-badge">{freeTagLabel}</span> : null}
            {post.title}
          </h2>
          <div className="hint-text">
            {authorLabel ? <span className="post-author">{authorLabel}</span> : null}
            {authorLabel ? <span aria-hidden="true"> · </span> : null}
            {post.city ? <span className="city-tag">{post.city}</span> : null}
            {post.created_at ? new Date(post.created_at).toLocaleString('ko-KR') : ''}
          </div>
        </div>
        {category ? (
          <Link href={`/board/${category.slug}`} className="btn btn-outline">
            목록
          </Link>
        ) : null}
      </div>

      <div className="card" style={{ whiteSpace: 'pre-wrap', marginBottom: 24 }}>
        {post.body}
      </div>

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
