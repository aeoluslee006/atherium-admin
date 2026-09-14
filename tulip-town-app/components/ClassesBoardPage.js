import Link from 'next/link';
import LocalizedPostTitle from './LocalizedPostTitle';
import { createServerT, getServerLocale } from '../lib/i18n/server';
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
  const locale = getServerLocale();
  const t = createServerT(locale);
  const numberLoc = locale === 'en' ? 'en-US' : 'ko-KR';
  const page = Math.max(1, parseInt(String(searchParams.page || '1'), 10) || 1);

  let posts = [];
  try {
    posts = await supabaseRest(
      'posts?select=id,title,title_en,city,address_text,contact_text,is_pinned,created_at,author_id,view_count&category_slug=eq.classes&order=is_pinned.desc,created_at.desc'
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
          <h2 className="section-title">{t('board.classes.title')}</h2>
          <p className="classes-board-count">
            {t('board.totalCount', { count: total.toLocaleString(numberLoc) })}
            <span aria-hidden="true"> </span>
            {t('common.page', { n: safePage })}
          </p>
        </div>
        <Link href="/board/classes/new" className="btn">
          {t('board.write')}
        </Link>
      </div>

      <div className="card classes-bbs">
        <div className="classes-bbs-head" aria-hidden="true">
          <span className="classes-bbs-num">{t('board.col.no')}</span>
          <span className="classes-bbs-title">{t('board.col.title')}</span>
          <span className="classes-bbs-author">{t('board.col.author')}</span>
          <span className="classes-bbs-views">{t('board.col.views')}</span>
          <span className="classes-bbs-date">{t('board.col.date')}</span>
        </div>

        {pagePosts.length ? (
          <div className="classes-bbs-list">
            {pagePosts.map((post) => {
              const pinned = Boolean(post.is_pinned);
              const numLabel = pinned ? t('board.notice') : String(boardNumbers.get(post.id) || '');
              const author =
                post.id === SAMPLE_CLASSES_POST_ID
                  ? t('board.sample')
                  : authors[post.author_id] || t('board.member');
              const views =
                typeof post.view_count === 'number'
                  ? post.view_count.toLocaleString(numberLoc)
                  : '—';
              const showNew = isNewPost(post.created_at);

              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className={`classes-bbs-row${pinned ? ' is-notice' : ''}`}
                >
                  <span className={`classes-bbs-num${pinned ? ' is-notice' : ''}`}>{numLabel}</span>
                  <span className="classes-bbs-title">
                    <LocalizedPostTitle post={post} className="classes-bbs-title-text" />
                    {showNew ? (
                      <span className="classes-bbs-new" title={t('board.newBadge')}>
                        N
                      </span>
                    ) : null}
                  </span>
                  <span className="classes-bbs-author">{author}</span>
                  <span className="classes-bbs-views">{views}</span>
                  <span className="classes-bbs-date">{formatListDate(post.created_at)}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">{t('board.emptyClasses')}</div>
        )}
      </div>

      {totalPages > 1 ? (
        <nav className="classes-bbs-pager" aria-label={t('board.pagerAria')}>
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
