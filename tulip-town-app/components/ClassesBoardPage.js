import Link from 'next/link';
import { getSampleClassesPost, SAMPLE_CLASSES_POST_ID } from '../lib/sampleClassesPost';
import { supabaseRest } from '../lib/supabaseRest';

const PAGE_SIZE = 20;

function formatListDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  } catch {
    return '';
  }
}

function isNewPost(value) {
  if (!value) return false;
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < 1000 * 60 * 60 * 72; // 3 days
}

async function loadAuthorMap(posts) {
  const ids = [...new Set((posts || []).map((p) => p.author_id).filter(Boolean))];
  if (!ids.length) return {};
  try {
    const rows = await supabaseRest(
      `profiles?select=id,username,display_name&id=in.(${ids.map(encodeURIComponent).join(',')})`
    );
    const map = {};
    for (const row of rows || []) {
      map[row.id] = row.username || row.display_name || '';
    }
    return map;
  } catch {
    return {};
  }
}

export default async function ClassesBoardPage({ searchParams = {} }) {
  const page = Math.max(1, parseInt(String(searchParams.page || '1'), 10) || 1);

  let posts = [];
  try {
    posts = await supabaseRest(
      'posts?select=id,title,city,address_text,contact_text,is_pinned,created_at,author_id,view_count&category_slug=eq.classes&order=is_pinned.desc,created_at.desc'
    );
  } catch {
    try {
      posts = await supabaseRest(
        'posts?select=id,title,city,is_pinned,created_at,author_id&category_slug=eq.classes&order=is_pinned.desc,created_at.desc'
      );
    } catch {
      posts = [];
    }
  }

  if (!Array.isArray(posts)) posts = [];
  const hasReal = posts.some((p) => p.id && p.id !== SAMPLE_CLASSES_POST_ID);
  if (!hasReal) {
    posts = [getSampleClassesPost(), ...posts];
  }

  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pagePosts = posts.slice(start, start + PAGE_SIZE);
  const authors = await loadAuthorMap(pagePosts);

  const boardNumbers = new Map();
  let nextNum = posts.filter((p) => !p.is_pinned).length;
  for (const post of posts) {
    if (!post.is_pinned) {
      boardNumbers.set(post.id, nextNum);
      nextNum -= 1;
    }
  }

  return (
    <div className="container">
      <div className="row-between classes-board-head">
        <div>
          <h2 className="section-title">수업/교육</h2>
          <p className="classes-board-count">
            Total {total.toLocaleString('ko-KR')}건
            <span aria-hidden="true"> </span>
            {safePage} 페이지
          </p>
        </div>
        <Link href="/board/classes/new" className="btn">
          글쓰기
        </Link>
      </div>

      <div className="card classes-bbs">
        <div className="classes-bbs-head" aria-hidden="true">
          <span className="classes-bbs-num">번호</span>
          <span className="classes-bbs-title">제목</span>
          <span className="classes-bbs-author">글쓴이</span>
          <span className="classes-bbs-views">조회</span>
          <span className="classes-bbs-date">날짜</span>
        </div>

        {pagePosts.length ? (
          <div className="classes-bbs-list">
            {pagePosts.map((post) => {
              const pinned = Boolean(post.is_pinned);
              const numLabel = pinned ? '공지' : String(boardNumbers.get(post.id) || '');
              const author =
                post.id === SAMPLE_CLASSES_POST_ID
                  ? '예시'
                  : authors[post.author_id] || '회원';
              const views =
                typeof post.view_count === 'number' ? post.view_count.toLocaleString('ko-KR') : '—';
              const showNew = isNewPost(post.created_at);

              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className={`classes-bbs-row${pinned ? ' is-notice' : ''}`}
                >
                  <span className={`classes-bbs-num${pinned ? ' is-notice' : ''}`}>{numLabel}</span>
                  <span className="classes-bbs-title">
                    <span className="classes-bbs-title-text">{post.title}</span>
                    {showNew ? <span className="classes-bbs-new" title="새 글">N</span> : null}
                  </span>
                  <span className="classes-bbs-author">{author}</span>
                  <span className="classes-bbs-views">{views}</span>
                  <span className="classes-bbs-date">{formatListDate(post.created_at)}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">아직 게시글이 없습니다. 첫 글을 남겨보세요!</div>
        )}
      </div>

      {totalPages > 1 ? (
        <nav className="classes-bbs-pager" aria-label="페이지">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={p === 1 ? '/board/classes' : `/board/classes?page=${p}`}
              className={`classes-bbs-page${p === safePage ? ' is-active' : ''}`}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
