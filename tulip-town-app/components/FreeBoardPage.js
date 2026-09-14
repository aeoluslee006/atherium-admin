import Link from 'next/link';
import { redirect } from 'next/navigation';
import LocalizedPostTitle from './LocalizedPostTitle';
import { FREE_BOARD_TAGS, getFreeBoardTagLabel, isValidFreeBoardTag } from '../lib/freeBoardTags';
import { createServerT, getServerLocale } from '../lib/i18n/server';
import { getSampleFreeClubPost, SAMPLE_FREE_CLUB_POST_ID } from '../lib/sampleFreeClubPost';
import { supabaseRest } from '../lib/supabaseRest';

function formatDate(value, locale) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR');
  } catch {
    return '';
  }
}

function buildHref(tag) {
  if (!tag || tag === 'all') return '/board/free';
  return `/board/free?tag=${encodeURIComponent(tag)}`;
}

export default async function FreeBoardPage({ searchParams = {} }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
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
      'posts?select=id,title,title_en,subcategory,created_at,is_featured&category_slug=eq.free';
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
        <h2 className="section-title">{t('board.free.title')}</h2>
        <p className="board-heading-desc">{t('board.free.desc')}</p>
      </header>

      <div className="board-toolbar">
        <div className="tag-chips" role="list" aria-label={t('board.filterAria')}>
          <Link
            href={buildHref('all')}
            role="listitem"
            className={`free-board-chip${tag === 'all' ? ' is-active' : ''}`}
          >
            {t('board.all')}
          </Link>
          <Link
            href={buildHref('featured')}
            role="listitem"
            className={`free-board-chip${tag === 'featured' ? ' is-active' : ''}`}
          >
            {t('board.featured')}
          </Link>
          {FREE_BOARD_TAGS.map((tagItem) => (
            <Link
              key={tagItem.slug}
              href={buildHref(tagItem.slug)}
              role="listitem"
              className={`free-board-chip${tag === tagItem.slug ? ' is-active' : ''}`}
            >
              {locale === 'en' ? tagItem.nameEn || tagItem.nameKo : tagItem.nameKo}
            </Link>
          ))}
        </div>
        <Link href="/board/free/new" className="btn">
          {t('board.write')}
        </Link>
      </div>

      <div className="wf-box free-board">
        <div className="free-board-list">
          {posts?.length ? (
            posts.map((post) => {
              const label = getFreeBoardTagLabel(post.subcategory, locale);
              return (
                <Link key={post.id} href={`/post/${post.id}`} className="free-board-row">
                  <span className="free-board-row-main">
                    {label ? <span className="subcat-badge">{label}</span> : null}
                    <LocalizedPostTitle post={post} className="free-board-row-title" />
                  </span>
                  <span className="post-meta">{formatDate(post.created_at, locale)}</span>
                </Link>
              );
            })
          ) : (
            <div className="empty-state">
              {isFeaturedFilter
                ? t('board.free.emptyFeatured')
                : tag !== 'all'
                  ? t('board.free.emptyTag')
                  : t('board.empty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
