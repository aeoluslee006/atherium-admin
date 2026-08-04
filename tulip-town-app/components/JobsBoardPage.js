import Link from 'next/link';
import { JOB_TAGS, getJobTagLabel, isValidJobTag } from '../lib/jobTags';
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
  if (!tag || tag === 'all') return '/board/jobs';
  return `/board/jobs?tag=${encodeURIComponent(tag)}`;
}

function initialFrom(name) {
  const s = String(name || '').trim();
  if (!s) return 'J';
  return s.slice(0, 1).toUpperCase();
}

export default async function JobsBoardPage({ searchParams = {} }) {
  const rawTag = searchParams.tag || 'all';
  const tag = isValidJobTag(rawTag) ? rawTag : 'all';

  let posts = [];

  try {
    let path =
      'posts?select=id,title,body,subcategory,is_pinned,created_at,author_id,view_count,city,company_name,company_logo,pay_text&category_slug=eq.jobs';
    if (tag !== 'all') path += `&subcategory=eq.${encodeURIComponent(tag)}`;
    path += '&order=is_pinned.desc,created_at.desc';

    try {
      posts = await supabaseRest(path);
    } catch {
      let fallback =
        'posts?select=id,title,body,subcategory,is_pinned,created_at,author_id,city&category_slug=eq.jobs';
      if (tag !== 'all') fallback += `&subcategory=eq.${encodeURIComponent(tag)}`;
      fallback += '&order=is_pinned.desc,created_at.desc';
      posts = await supabaseRest(fallback);
    }
  } catch {
    posts = [];
  }

  return (
    <div className="container">
      <header className="jobs-board-head">
        <h2 className="section-title">구인구직</h2>
        <p className="hint-text jobs-board-lead">
          회사명이 먼저 보이게, 로고는 하나만 — 줄 단위로 빠르게 훑을 수 있게 구성했습니다.
        </p>
      </header>

      <div className="board-toolbar jobs-toolbar">
        <div className="tag-chips" role="list" aria-label="구인구직 필터">
          <Link
            href={buildHref('all')}
            role="listitem"
            className={`free-board-chip${tag === 'all' ? ' is-active' : ''}`}
          >
            전체
          </Link>
          {JOB_TAGS.map((t) => (
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
        <Link href="/board/jobs/new" className="btn">
          글쓰기
        </Link>
      </div>

      <div className="wf-box jobs-board">
        <div className="jobs-board-meta">Total {(posts || []).length}건</div>

        {(posts || []).length ? (
          <ul className="jobs-list">
            {posts.map((post) => {
              const company =
                post.company_name ||
                (post.is_pinned ? '공지' : getJobTagLabel(post.subcategory) || '채용');
              const tagLabel = post.is_pinned ? '공지' : getJobTagLabel(post.subcategory);
              const views = Number.isFinite(post.view_count) ? post.view_count : null;
              return (
                <li key={post.id}>
                  <Link
                    href={`/post/${post.id}`}
                    className={`jobs-row${post.is_pinned ? ' is-notice' : ''}`}
                  >
                    <div className="jobs-logo" aria-hidden="true">
                      {post.company_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.company_logo} alt="" />
                      ) : (
                        <span className="jobs-logo-fallback">{initialFrom(company)}</span>
                      )}
                    </div>

                    <div className="jobs-row-main">
                      <div className="jobs-company-line">
                        <span className="jobs-company">{company}</span>
                        {post.city ? <span className="jobs-city">{post.city}</span> : null}
                      </div>
                      <div className="jobs-title-line">
                        {tagLabel ? (
                          <span className={`job-badge job-badge--${post.subcategory || 'notice'}`}>
                            {tagLabel}
                          </span>
                        ) : null}
                        <span className="jobs-title">{post.title}</span>
                        {post.pay_text ? <span className="jobs-pay">{post.pay_text}</span> : null}
                      </div>
                    </div>

                    <div className="jobs-row-meta">
                      {views != null ? <span className="jobs-views">{views}</span> : null}
                      <span className="jobs-date">{formatListDate(post.created_at)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-state">아직 구인구직 글이 없습니다. 첫 글을 남겨보세요!</div>
        )}
      </div>
    </div>
  );
}
