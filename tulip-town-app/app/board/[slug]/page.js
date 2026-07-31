import Link from 'next/link';
import { getCategory } from '../../../lib/categories';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export default async function BoardPage({ params }) {
  const category = getCategory(params.slug);
  if (!category) {
    return (
      <div className="container">
        <div className="card empty-state">존재하지 않는 게시판입니다.</div>
      </div>
    );
  }

  let posts = [];
  try {
    posts = await supabaseRest(
      `posts?select=id,title,city,is_pinned,created_at&category_slug=eq.${encodeURIComponent(
        params.slug
      )}&order=is_pinned.desc,created_at.desc`
    );
  } catch {
    posts = [];
  }

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            {category.nameKo} · {category.nameEn}
          </h2>
          <div className="hint-text">{category.desc}</div>
        </div>
        <Link href={`/board/${params.slug}/new`} className="btn">
          글쓰기
        </Link>
      </div>
      <div className="card">
        {posts?.length ? (
          posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="post-row">
              <span className="post-title">
                {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
                {post.city ? <span className="city-tag">{post.city}</span> : null}
                {post.title}
              </span>
              <span className="post-meta">
                {post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR') : ''}
              </span>
            </Link>
          ))
        ) : (
          <div className="empty-state">아직 게시글이 없습니다. 첫 글을 남겨보세요!</div>
        )}
      </div>
    </div>
  );
}
