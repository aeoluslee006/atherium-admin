import Link from 'next/link';
import { FREE_BOARD_TAGS, getFreeBoardTagLabel, isValidFreeBoardTag } from '../lib/freeBoardTags';
import { supabaseRest } from '../lib/supabaseRest';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

function buildHref({ tab, tag }) {
  const params = new URLSearchParams();
  if (tab && tab !== 'latest') params.set('tab', tab);
  if (tag && tag !== 'all') params.set('tag', tag);
  const qs = params.toString();
  return qs ? `/board/free?${qs}` : '/board/free';
}

export default async function FreeBoardPage({ searchParams = {} }) {
  const tab = searchParams.tab === 'featured' ? 'featured' : 'latest';
  const tag = isValidFreeBoardTag(searchParams.tag) ? searchParams.tag : 'all';

  let posts = [];
  try {
    let path =
      'posts?select=id,title,subcategory,created_at,is_featured&category_slug=eq.free';
    if (tab === 'featured') {
      path += '&is_featured=eq.true';
    }
    if (tag !== 'all') {
      path += `&subcategory=eq.${encodeURIComponent(tag)}`;
    }
    path += '&order=created_at.desc';
    posts = await supabaseRest(path);
  } catch {
    posts = [];
  }

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            자유게시판 · Free Board
          </h2>
          <div className="hint-text">자유롭게 이야기해요 · General talk</div>
        </div>
        <Link href="/board/free/new" className="btn">
          글쓰기
        </Link>
      </div>

      <div className="wf-box free-board">
        <div className="free-board-tabs" role="tablist" aria-label="자유게시판 정렬">
          <Link
            href={buildHref({ tab: 'latest', tag })}
            role="tab"
            aria-selected={tab === 'latest'}
            className={`free-board-tab${tab === 'latest' ? ' is-active' : ''}`}
          >
            최신글
          </Link>
          <Link
            href={buildHref({ tab: 'featured', tag })}
            role="tab"
            aria-selected={tab === 'featured'}
            className={`free-board-tab${tab === 'featured' ? ' is-active' : ''}`}
          >
            좋은글
          </Link>
        </div>

        <div className="free-board-chips" role="list" aria-label="서브카테고리 필터">
          <Link
            href={buildHref({ tab, tag: 'all' })}
            role="listitem"
            className={`free-board-chip${tag === 'all' ? ' is-active' : ''}`}
          >
            전체
          </Link>
          {FREE_BOARD_TAGS.map((t) => (
            <Link
              key={t.slug}
              href={buildHref({ tab, tag: t.slug })}
              role="listitem"
              className={`free-board-chip${tag === t.slug ? ' is-active' : ''}`}
            >
              {t.nameKo}
            </Link>
          ))}
        </div>

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
              {tab === 'featured'
                ? '아직 좋은글로 지정된 글이 없습니다.'
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
