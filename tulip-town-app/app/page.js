import Link from 'next/link';
import { CATEGORIES } from '../lib/categories';
import { supabaseRest } from '../lib/supabaseRest';

export const dynamic = 'force-dynamic';

async function getLatestPosts() {
  try {
    return await supabaseRest(
      'posts?select=id,title,category_slug,city,is_pinned,created_at&order=is_pinned.desc,created_at.desc&limit=12'
    );
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const posts = await getLatestPosts();

  return (
    <div className="container">
      <h2 className="section-title">게시판 · Boards</h2>
      <div className="category-grid">
        {CATEGORIES.map((cat) => (
          <Link key={cat.slug} href={`/board/${cat.slug}`} className="category-card">
            <div className="ko">{cat.nameKo}</div>
            <div className="en">{cat.nameEn}</div>
            <div className="desc">{cat.desc}</div>
          </Link>
        ))}
        <Link href="/directory" className="category-card">
          <div className="ko">업체 디렉토리</div>
          <div className="en">Business Directory</div>
          <div className="desc">한인 업체 · Local Korean businesses</div>
        </Link>
      </div>

      <h2 className="section-title">최신 글 · Latest posts</h2>
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
