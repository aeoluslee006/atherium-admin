import Link from 'next/link';
import AutoTranslatedText from './AutoTranslatedText';
import LocalizedPostTitle from './LocalizedPostTitle';
import { JOB_TAGS, getJobTagLabel, getWorkStatusTags, isValidJobTag } from '../lib/jobTags';
import { createServerT, getServerLocale } from '../lib/i18n/server';
import { getSampleJobsPost, SAMPLE_JOBS_POST_ID } from '../lib/sampleJobsPost';
import { supabaseRest } from '../lib/supabaseRest';

function formatListDate(value, locale) {
  if (!value) return '';
  const loc = locale === 'en' ? 'en-US' : 'ko-KR';
  try {
    const d = new Date(value);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString(loc, { month: '2-digit', day: '2-digit' });
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

function tagLabel(tagItem, locale) {
  if (!tagItem) return '';
  return locale === 'en' ? tagItem.nameEn || tagItem.nameKo : tagItem.nameKo;
}

export default async function JobsBoardPage({ searchParams = {} }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const rawTag = searchParams.tag || 'all';
  const tag = isValidJobTag(rawTag) ? rawTag : 'all';

  let posts = [];

  try {
    let path =
      'posts?select=id,title,title_en,body,subcategory,is_pinned,created_at,author_id,view_count,city,company_name,company_logo,pay_text,job_roles&category_slug=eq.jobs';
    if (tag !== 'all') path += `&subcategory=eq.${encodeURIComponent(tag)}`;
    path += '&order=is_pinned.desc,created_at.desc';

    try {
      posts = await supabaseRest(path);
    } catch {
      try {
        let mid =
          'posts?select=id,title,body,subcategory,is_pinned,created_at,author_id,view_count,city,company_name,company_logo,pay_text&category_slug=eq.jobs';
        if (tag !== 'all') mid += `&subcategory=eq.${encodeURIComponent(tag)}`;
        mid += '&order=is_pinned.desc,created_at.desc';
        posts = await supabaseRest(mid);
      } catch {
        let fallback =
          'posts?select=id,title,body,subcategory,is_pinned,created_at,author_id,city&category_slug=eq.jobs';
        if (tag !== 'all') fallback += `&subcategory=eq.${encodeURIComponent(tag)}`;
        fallback += '&order=is_pinned.desc,created_at.desc';
        posts = await supabaseRest(fallback);
      }
    }
  } catch {
    posts = [];
  }

  // Show built-in QA sample until a real jobs post exists in DB.
  if (!Array.isArray(posts)) posts = [];
  const hasReal = posts.some((p) => p?.id && p.id !== SAMPLE_JOBS_POST_ID);
  if (!hasReal && (tag === 'all' || tag === 'hire')) {
    posts = [getSampleJobsPost(), ...posts];
  }

  return (
    <div className="container">
      <header className="jobs-board-head">
        <h2 className="section-title">{t('board.jobs.title')}</h2>
      </header>

      <div className="board-toolbar jobs-toolbar">
        <div className="tag-chips" role="list" aria-label={t('board.jobs.filterAria')}>
          <Link
            href={buildHref('all')}
            role="listitem"
            className={`free-board-chip${tag === 'all' ? ' is-active' : ''}`}
          >
            {t('board.all')}
          </Link>
          {JOB_TAGS.map((tagItem) => (
            <Link
              key={tagItem.slug}
              href={buildHref(tagItem.slug)}
              role="listitem"
              className={`free-board-chip${tag === tagItem.slug ? ' is-active' : ''}`}
            >
              {tagLabel(tagItem, locale)}
            </Link>
          ))}
        </div>
        <Link href="/board/jobs/new" className="btn">
          {t('board.write')}
        </Link>
      </div>

      <div className="wf-box jobs-board">
        <div className="jobs-board-meta">{t('board.totalCount', { count: (posts || []).length })}</div>

        {(posts || []).length ? (
          <ul className="jobs-list">
            {posts.map((post) => {
              const company =
                post.company_name ||
                (post.is_pinned
                  ? t('board.notice')
                  : getJobTagLabel(post.subcategory, locale) || t('board.jobs.hire'));
              const jobTag = post.is_pinned
                ? t('board.notice')
                : getJobTagLabel(post.subcategory, locale);
              const views = Number.isFinite(post.view_count) ? post.view_count : null;
              const workStatuses = getWorkStatusTags(post.job_roles);
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
                        {jobTag ? (
                          <span className={`jobs-type-sign jobs-type-sign--${post.subcategory || 'notice'}`}>
                            {jobTag}
                          </span>
                        ) : null}
                        <span className="jobs-company">{company}</span>
                        {post.city ? <span className="jobs-city">{post.city}</span> : null}
                      </div>
                      <div className="jobs-title-line">
                        {workStatuses.length
                          ? workStatuses.map((status) => (
                              <span
                                key={status.slug}
                                className={`job-status-badge job-status-badge--${status.slug}`}
                              >
                                {tagLabel(status, locale)}
                              </span>
                            ))
                          : null}
                        <LocalizedPostTitle post={post} className="jobs-title" />
                        {post.pay_text ? (
                          <span className="jobs-pay">
                            <AutoTranslatedText text={post.pay_text} />
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="jobs-row-meta">
                      {views != null ? <span className="jobs-views">{views}</span> : null}
                      <span className="jobs-date">{formatListDate(post.created_at, locale)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-state">{t('board.emptyJobs')}</div>
        )}
      </div>
    </div>
  );
}
