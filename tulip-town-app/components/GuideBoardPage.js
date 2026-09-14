import Link from 'next/link';
import LocalizedPostTitle from './LocalizedPostTitle';
import SettlementGuideMap from './SettlementGuideMap';
import { getCategory } from '../lib/categories';
import { createServerT, getServerLocale } from '../lib/i18n/server';
import { isValidSettlementCity } from '../lib/settlementTowns';
import { supabaseRest } from '../lib/supabaseRest';

function formatDate(value, locale) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR');
  } catch {
    return '';
  }
}

export default async function GuideBoardPage({ searchParams = {} }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const category = getCategory('guide');
  const rawCity = searchParams.city || '';
  const city = isValidSettlementCity(rawCity) ? rawCity : null;

  let posts = [];
  if (city) {
    try {
      posts = await supabaseRest(
        `posts?select=id,title,title_en,city,is_pinned,created_at&category_slug=eq.guide&city=eq.${encodeURIComponent(
          city
        )}&order=is_pinned.desc,created_at.desc`
      );
    } catch {
      posts = [];
    }
  }

  const categoryTitle =
    locale === 'en'
      ? category?.nameEn || t('board.guide.title')
      : category?.nameKo || t('board.guide.title');

  return (
    <div className="container guide-board-page">
      <header className="guide-board-head">
        <div className="board-heading">
          <h2 className="section-title">{categoryTitle}</h2>
          <p className="board-heading-desc">{t('board.guide.desc')}</p>
        </div>
      </header>

      <SettlementGuideMap city={city} />

      {city ? (
        <div className="card guide-board-list">
          <div className="guide-board-list-head">
            <h3 className="guide-board-list-title">{t('board.guide.cityPosts', { city })}</h3>
          </div>
          {posts?.length ? (
            posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`} className="post-row">
                <span className="post-title">
                  {post.is_pinned ? <span className="post-pinned">[{t('board.pinned')}]</span> : null}
                  {post.city ? <span className="city-tag">{post.city}</span> : null}
                  <LocalizedPostTitle post={post} />
                </span>
                <span className="post-meta">{formatDate(post.created_at, locale)}</span>
              </Link>
            ))
          ) : (
            <div className="empty-state">{t('board.emptyGuide')}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
