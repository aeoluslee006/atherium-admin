import Link from 'next/link';
import { getSampleClubsPost, SAMPLE_CLUBS_POST_ID } from '../lib/sampleClubsPost';
import { supabaseRest } from '../lib/supabaseRest';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export default async function ClubsBoardPage() {
  let posts = [];
  try {
    posts = await supabaseRest(
      'posts?select=id,title,city,address_text,contact_text,is_pinned,created_at&category_slug=eq.clubs&order=is_pinned.desc,created_at.desc'
    );
  } catch {
    posts = [];
  }

  if (!Array.isArray(posts)) posts = [];
  const hasReal = posts.some((p) => p.id && p.id !== SAMPLE_CLUBS_POST_ID);
  if (!hasReal) {
    posts = [getSampleClubsPost(), ...posts];
  }

  return (
    <div className="container">
      <div className="row-between">
        <div className="board-heading">
          <h2 className="section-title">동호회</h2>
          <p className="board-heading-desc">취미 · 모임 · Interest groups & clubs</p>
        </div>
        <Link href="/board/clubs/new" className="btn">
          글쓰기
        </Link>
      </div>

      <div className="card clubs-board">
        <div className="clubs-board-list">
          {posts?.length ? (
            posts.map((post) => {
              const place = post.address_text || post.city || '';
              return (
                <Link key={post.id} href={`/post/${post.id}`} className="clubs-board-row">
                  <span className="clubs-board-row-main">
                    {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
                    <span className="clubs-board-row-title">{post.title}</span>
                    {place ? <span className="clubs-board-row-place">{place}</span> : null}
                  </span>
                  <span className="post-meta">{formatDate(post.created_at)}</span>
                </Link>
              );
            })
          ) : (
            <div className="empty-state">아직 게시글이 없습니다. 첫 글을 남겨보세요!</div>
          )}
        </div>
      </div>
    </div>
  );
}
