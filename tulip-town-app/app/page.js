import Link from 'next/link';
import AutoTranslatedText from '../components/AutoTranslatedText';
import LocalNewsPanel from '../components/LocalNewsPanel';
import { getCategory } from '../lib/categories';
import { pickDailyFeatured, siteDateKey } from '../lib/dailyFeatured';
import { createServerT, getServerLocale } from '../lib/i18n/server';
import { localizePostFields } from '../lib/i18n/postLocale';
import { isExampleLocalNews } from '../lib/localNews';
import { getSampleClassesPost, SAMPLE_CLASSES_POST_ID } from '../lib/sampleClassesPost';
import { supabaseRest } from '../lib/supabaseRest';

export const dynamic = 'force-dynamic';

function formatDate(value, locale = 'ko') {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR');
  } catch {
    return '';
  }
}

function excerpt(text, max = 110) {
  if (!text) return '';
  const plain = String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}…`;
}

function letterBody(text, max = 1100) {
  if (!text) return '';
  const plain = String(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}…`;
}

async function safeRest(path) {
  try {
    return await supabaseRest(path);
  } catch {
    return [];
  }
}

async function getHomeData() {
  const featuredSelectWithPaper =
    'posts?select=id,title,title_en,body,body_en,category_slug,created_at,is_featured,stationery_id,subcategory&is_featured=eq.true&order=created_at.desc&limit=50';
  const featuredSelectBasic =
    'posts?select=id,title,title_en,body,body_en,category_slug,created_at,is_featured&is_featured=eq.true&order=created_at.desc&limit=50';

  const [premiumAds, localNewsRaw, featuredWithPaper, classPosts, marketPosts] = await Promise.all([
    safeRest(
      'sponsors?select=id,business_name,category,city,description,website_url,discount_text,tier,listing_type,status&listing_type=eq.banner&status=eq.approved&tier=eq.premium&order=created_at.desc&limit=2'
    ),
    safeRest(
      'local_news?select=id,title,source,url,published_at,is_active&is_active=eq.true&order=published_at.desc&limit=20'
    ),
    safeRest(featuredSelectWithPaper),
    safeRest(
      'posts?select=id,title,title_en,created_at&category_slug=eq.classes&order=created_at.desc&limit=6'
    ),
    safeRest(
      'posts?select=id,title,title_en,created_at&category_slug=eq.market&order=created_at.desc&limit=6'
    ),
  ]);

  let featuredPool = Array.isArray(featuredWithPaper) ? featuredWithPaper : [];
  if (!featuredPool.length) {
    featuredPool = await safeRest(featuredSelectBasic);
  }

  const featuredPost = pickDailyFeatured(featuredPool, siteDateKey());

  const localNews = (Array.isArray(localNewsRaw) ? localNewsRaw : [])
    .filter((row) => !isExampleLocalNews(row))
    .slice(0, 4);

  let classes = Array.isArray(classPosts) ? classPosts : [];
  const hasRealClass = classes.some((p) => p.id && p.id !== SAMPLE_CLASSES_POST_ID);
  if (!hasRealClass) {
    const sample = getSampleClassesPost();
    classes = [{ id: sample.id, title: sample.title, created_at: sample.created_at }, ...classes];
  }

  return {
    premiumAds,
    localNews,
    featuredPost,
    featuredPoolCount: featuredPool.length,
    classPosts: classes,
    marketPosts: Array.isArray(marketPosts) ? marketPosts : [],
  };
}

function padAds(ads) {
  const rows = Array.isArray(ads) ? [...ads] : [];
  while (rows.length < 2) rows.push(null);
  return rows.slice(0, 2);
}

function SimpleRows({ posts, empty, locale }) {
  if (!posts?.length) {
    return <div className="wf-empty">{empty}</div>;
  }
  return (
    <ul className="wf-list">
      {posts.map((post) => {
        const localized = localizePostFields(post, locale);
        return (
          <li key={post.id}>
            <Link href={`/post/${post.id}`} className="wf-list-row">
              <AutoTranslatedText text={localized.title} as="span" className="wf-list-title" />
              <time className="wf-list-date">{formatDate(post.created_at, locale)}</time>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function HomePage() {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const { premiumAds, localNews, featuredPost, featuredPoolCount, classPosts, marketPosts } =
    await getHomeData();
  const ads = padAds(premiumAds);
  const cat = featuredPost ? getCategory(featuredPost.category_slug) : null;
  const localizedFeatured = featuredPost ? localizePostFields(featuredPost, locale) : null;
  const bodyText = localizedFeatured ? letterBody(localizedFeatured.body) : '';
  const categoryLabel = cat
    ? locale === 'en'
      ? cat.nameEn || cat.nameKo
      : cat.nameKo
    : t('home.boardFallback');

  return (
    <div className="container home-page">
      <section className="wf-ads" aria-label={t('home.premiumAds')}>
        {ads.map((ad, idx) => {
          if (!ad) {
            return (
              <div key={`ad-empty-${idx}`} className="wf-ads-card premium-ad-card wf-ads-card--empty">
                <div className="wf-ads-kicker">Premium</div>
                <div className="wf-ads-name wf-ads-name--placeholder">{t('home.premiumAd')}</div>
              </div>
            );
          }
          const body = (
            <>
              <div className="wf-ads-kicker">Premium</div>
              {ad.discount_text ? <span className="wf-ads-badge">{ad.discount_text}</span> : null}
              <div className="wf-ads-name">{ad.business_name}</div>
              <div className="wf-ads-meta">
                {[ad.category, ad.city].filter(Boolean).join(' · ')}
              </div>
              {ad.description ? (
                <AutoTranslatedText
                  text={excerpt(ad.description, 90)}
                  as="p"
                  className="wf-ads-desc"
                />
              ) : null}
            </>
          );
          return ad.website_url ? (
            <a
              key={ad.id}
              href={ad.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="wf-ads-card premium-ad-card"
            >
              {body}
            </a>
          ) : (
            <div key={ad.id} className="wf-ads-card premium-ad-card">
              {body}
            </div>
          );
        })}
      </section>

      <section className="wf-mid" aria-label={t('home.midSection')}>
        <LocalNewsPanel items={localNews || []} />

        <div className="wf-box wf-featured">
          <div className="panel-header">
            <h2 className="panel-title">{t('home.featured')}</h2>
            <Link href="/board/free?tag=featured" className="panel-more">
              {t('home.more')}
            </Link>
          </div>
          {featuredPost ? (
            <Link href={`/post/${featuredPost.id}`} className="wf-featured-letter">
              <div className="wf-featured-letter-top">
                <span className="wf-featured-today">{t('home.todayPost')}</span>
                <div className="wf-featured-meta">
                  <span>{categoryLabel}</span>
                  <time>{formatDate(featuredPost.created_at, locale)}</time>
                </div>
              </div>
              <AutoTranslatedText
                text={localizedFeatured?.title || featuredPost.title}
                as="div"
                className="wf-featured-name"
              />
              {bodyText ? (
                <AutoTranslatedText text={bodyText} as="p" className="wf-featured-letter-body" />
              ) : null}
              {featuredPoolCount > 1 ? (
                <span className="wf-featured-letter-foot">
                  {t('home.featuredFoot', { count: featuredPoolCount })}
                </span>
              ) : null}
            </Link>
          ) : (
            <div className="wf-empty wf-empty--grow">{t('home.emptyFeaturedHelp')}</div>
          )}
        </div>
      </section>

      <section className="wf-box wf-bottom" aria-label={t('home.bottomSection')}>
        <div className="wf-bottom-col classes-latest">
          <div className="panel-header">
            <h2 className="panel-title">{t('home.classesLatest')}</h2>
            <Link href="/board/classes" className="panel-more">
              {t('home.more')}
            </Link>
          </div>
          <SimpleRows posts={classPosts} empty={t('home.emptyClasses')} locale={locale} />
        </div>
        <div className="wf-bottom-divider" aria-hidden="true" />
        <div className="wf-bottom-col market-latest">
          <div className="panel-header">
            <h2 className="panel-title">{t('home.marketLatest')}</h2>
            <Link href="/board/market" className="panel-more">
              {t('home.more')}
            </Link>
          </div>
          <SimpleRows posts={marketPosts} empty={t('home.emptyMarket')} locale={locale} />
        </div>
      </section>
    </div>
  );
}
