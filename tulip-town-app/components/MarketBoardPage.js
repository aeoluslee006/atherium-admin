import Link from 'next/link';
import LocalizedPostTitle from './LocalizedPostTitle';
import { MARKET_TAGS, getMarketTagLabel, isValidMarketTag } from '../lib/marketTags';
import { createServerT, getServerLocale } from '../lib/i18n/server';
import { collectPostImages } from '../lib/postImages';
import { getSampleMarketPost, SAMPLE_MARKET_POST_ID } from '../lib/sampleMarketPost';
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
  if (!tag || tag === 'all') return '/board/market';
  return `/board/market?tag=${encodeURIComponent(tag)}`;
}

function tagLabel(tagItem, locale) {
  if (!tagItem) return '';
  return locale === 'en' ? tagItem.nameEn || tagItem.nameKo : tagItem.nameKo;
}

export default async function MarketBoardPage({ searchParams = {} }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const rawTag = searchParams.tag || 'all';
  const tag = isValidMarketTag(rawTag) ? rawTag : 'all';

  let posts = [];

  try {
    let path =
      'posts?select=id,title,title_en,body,subcategory,is_pinned,created_at,city,view_count,price_text,image_urls&category_slug=eq.market';
    if (tag !== 'all') path += `&subcategory=eq.${encodeURIComponent(tag)}`;
    path += '&order=is_pinned.desc,created_at.desc';

    try {
      posts = await supabaseRest(path);
    } catch {
      try {
        let mid =
          'posts?select=id,title,body,subcategory,is_pinned,created_at,city,view_count&category_slug=eq.market';
        if (tag !== 'all') mid += `&subcategory=eq.${encodeURIComponent(tag)}`;
        mid += '&order=is_pinned.desc,created_at.desc';
        posts = await supabaseRest(mid);
      } catch {
        let fallback =
          'posts?select=id,title,body,subcategory,is_pinned,created_at,city&category_slug=eq.market';
        if (tag !== 'all') fallback += `&subcategory=eq.${encodeURIComponent(tag)}`;
        fallback += '&order=is_pinned.desc,created_at.desc';
        posts = await supabaseRest(fallback);
      }
    }
  } catch {
    posts = [];
  }

  if (!Array.isArray(posts)) posts = [];
  const hasReal = posts.some((p) => p?.id && p.id !== SAMPLE_MARKET_POST_ID);
  if (!hasReal && (tag === 'all' || tag === 'sell')) {
    posts = [getSampleMarketPost(), ...posts];
  }

  return (
    <div className="container">
      <header className="market-board-head board-heading">
        <h2 className="section-title">{t('board.market.title')}</h2>
        <p className="board-heading-desc">{t('board.market.desc')}</p>
      </header>

      <div className="board-toolbar market-toolbar">
        <div className="tag-chips" role="list" aria-label={t('board.market.filterAria')}>
          <Link
            href={buildHref('all')}
            role="listitem"
            className={`free-board-chip${tag === 'all' ? ' is-active' : ''}`}
          >
            {t('board.all')}
          </Link>
          {MARKET_TAGS.map((tagItem) => (
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
        <Link href="/board/market/new" className="btn">
          {t('board.write')}
        </Link>
      </div>

      <div className="wf-box market-board">
        <div className="market-board-meta">
          {t('board.metaPhotos', { count: (posts || []).length })}
        </div>

        <div className="market-table market-table--photos" role="table" aria-label={t('board.market.listAria')}>
          <div className="market-table-head market-table-head--photos" role="row">
            <span role="columnheader">{t('board.col.photo')}</span>
            <span role="columnheader">{t('board.col.category')}</span>
            <span role="columnheader">{t('board.col.title')}</span>
            <span role="columnheader">{t('board.col.price')}</span>
            <span role="columnheader">{t('board.col.area')}</span>
            <span role="columnheader">{t('board.col.date')}</span>
          </div>

          {(posts || []).length ? (
            posts.map((post) => {
              const label = post.is_pinned
                ? t('board.notice')
                : getMarketTagLabel(post.subcategory, locale) || t('board.general');
              const photos = collectPostImages(post);
              const cover = photos[0] || null;
              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className={`market-table-row market-table-row--photos${post.is_pinned ? ' is-notice' : ''}${post.subcategory === 'done' ? ' is-done' : ''}`}
                  role="row"
                >
                  <span className="market-row-thumb" role="cell">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" />
                    ) : (
                      <span className="market-row-thumb-empty" aria-hidden="true">
                        —
                      </span>
                    )}
                    {photos.length > 1 ? (
                      <span className="market-row-photo-count">{photos.length}</span>
                    ) : null}
                  </span>
                  <span className="market-col-badge" role="cell">
                    <span
                      className={`market-badge market-badge--${post.subcategory || 'plain'}${post.is_pinned ? ' market-badge--notice' : ''}`}
                    >
                      {label}
                    </span>
                  </span>
                  <span className="market-col-title" role="cell">
                    <LocalizedPostTitle post={post} className="market-title-text" />
                  </span>
                  <span className="market-col-price" role="cell">
                    {post.price_text || '—'}
                  </span>
                  <span className="market-col-city" role="cell">
                    {post.city || '—'}
                  </span>
                  <span className="market-col-date" role="cell">
                    {formatListDate(post.created_at, locale)}
                  </span>
                </Link>
              );
            })
          ) : (
            <div className="empty-state">{t('board.emptyMarket')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
