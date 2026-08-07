import Link from 'next/link';
import { getSampleClassesPost, SAMPLE_CLASSES_POST_ID } from '../lib/sampleClassesPost';
import { supabaseRest } from '../lib/supabaseRest';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export default async function ClassesBoardPage() {
  let posts = [];
  try {
    posts = await supabaseRest(
      'posts?select=id,title,city,address_text,contact_text,is_pinned,created_at&category_slug=eq.classes&order=is_pinned.desc,created_at.desc'
    );
  } catch {
    posts = [];
  }

  if (!Array.isArray(posts)) posts = [];
  const hasReal = posts.some((p) => p.id && p.id !== SAMPLE_CLASSES_POST_ID);
  if (!hasReal) {
    posts = [getSampleClassesPost(), ...posts];
  }

  return (
    <div className="container">
      <div className="row-between">
        <div className="board-heading">
          <h2 className="section-title">수업/교육</h2>
          <p className="board-heading-desc">수업 · 과외 · 교육 · Classes & tutoring</p>
        </div>
        <Link href="/board/classes/new" className="btn">
          글쓰기
        </Link>
      </div>

      <div className="card classes-board">
        <div className="classes-board-list">
          {posts?.length ? (
            posts.map((post) => {
              const place = post.address_text || post.city || '';
              return (
                <Link key={post.id} href={`/post/${post.id}`} className="classes-board-row">
                  <span className="classes-board-row-main">
                    {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
                    <span className="classes-board-row-title">{post.title}</span>
                    {place ? <span className="classes-board-row-place">{place}</span> : null}
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
