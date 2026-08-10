import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FREE_BOARD_TAGS, getFreeBoardTagLabel, isValidFreeBoardTag } from '../lib/freeBoardTags';
import { getSampleFreeClubPost, SAMPLE_FREE_CLUB_POST_ID } from '../lib/sampleFreeClubPost';
import { supabaseRest } from '../lib/supabaseRest';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

function buildHref(tag) {
  if (!tag || tag === 'all') return '/board/free';
  return `/board/free?tag=${encodeURIComponent(tag)}`;
}

export default async function FreeBoardPage({ searchParams = {} }) {
  const rawTag = searchParams.tag || 'all';
  // Legacy 동호회 tag → 모임/동호회
  if (rawTag === 'club') {
    redirect('/board/free?tag=meetup');
  }
  const isFeaturedFilter = rawTag === 'featured';
  const tag = isFeaturedFilter ? 'featured' : isValidFreeBoardTag(rawTag) ? rawTag : 'all';

  let posts = [];
  try {
    let path =
      'posts?select=id,title,subcategory,created_at,is_featured&category_slug=eq.free';
    if (isFeaturedFilter) {
      // All 좋은글 posts (board), not only home-dashboard selections
      path += '&or=(subcategory.eq.featured,is_featured.eq.true)';
    } else if (tag === 'meetup') {
      // Include legacy 동호회 (club) posts under 모임/동호회
      path += '&subcategory=in.(meetup,club)';
    } else if (tag !== 'all') {
      path += `&subcategory=eq.${encodeURIComponent(tag)}`;
    }
    path += '&order=created_at.desc';
    posts = await supabaseRest(path);
  } catch {
    posts = [];
  }

  if (!Array.isArray(posts)) posts = [];
  const hasRealMeetup = posts.some(
    (p) =>
      (p.subcategory === 'meetup' || p.subcategory === 'club') &&
      p.id &&
      p.id !== SAMPLE_FREE_CLUB_POST_ID
  );
  const showMeetupSample =
    !hasRealMeetup && (tag === 'all' || tag === 'meetup') && !isFeaturedFilter;
  if (showMeetupSample) {
    posts = [getSampleFreeClubPost(), ...posts];
  }

  return (
    <div className="container">
      <header className="free-board-head board-heading">
        <h2 className="section-title">자유게시판 · Free Board</h2>
        <p className="board-heading-desc">자유롭게 이야기해요 · General talk</p>
      </header>

      <div className="board-toolbar">
        <div className="tag-chips" role="list" aria-label="카테고리 필터">
          <Link
            href={buildHref('all')}
            role="listitem"
            className={`free-board-chip${tag === 'all' ? ' is-active' : ''}`}
          >
            전체
          </Link>
          <Link
            href={buildHref('featured')}
            role="listitem"
            className={`free-board-chip${tag === 'featured' ? ' is-active' : ''}`}
          >
            좋은글
          </Link>
          {FREE_BOARD_TAGS.map((t) => (
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
        <Link href="/board/free/new" className="btn">
          글쓰기
        </Link>
      </div>

      <div className="wf-box free-board">
        <div className="free-board-list">
          {posts?.length ? (
            posts.map((post) => {
              const label = getFreeBoardTagLabel(post.subcategory);
              return (
                <Link key={post.id} href={`/post/${post.id}`} className="free-board-row">
                  <span className="free-board-row-main">
                    {label ? <span className="subcat-badge">{label}</span> : null}
                    <span className="free-board-row-title">{post.title}</span>
                  </span>
                  <span className="post-meta">{formatDate(post.created_at)}</span>
                </Link>
              );
            })
          ) : (
            <div className="empty-state">
              {isFeaturedFilter
                ? '아직 좋은글이 없습니다. 글쓰기에서 「좋은글」을 선택해 등록해 보세요.'
                : tag !== 'all'
                  ? '이 태그로 등록된 글이 아직 없습니다.'
                  : '아직 게시글이 없습니다. 첫 글을 남겨보세요!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
