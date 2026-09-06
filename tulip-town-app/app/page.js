import Link from 'next/link';
import LocalNewsPanel from '../components/LocalNewsPanel';
import { getCategory } from '../lib/categories';
import { pickDailyFeatured, siteDateKey } from '../lib/dailyFeatured';
import { isExampleLocalNews } from '../lib/localNews';
import { getSampleClassesPost, SAMPLE_CLASSES_POST_ID } from '../lib/sampleClassesPost';
import { stationeryClassName } from '../lib/stationery';
import { supabaseRest } from '../lib/supabaseRest';

export const dynamic = 'force-dynamic';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
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
    'posts?select=id,title,body,category_slug,created_at,is_featured,stationery_id,subcategory&is_featured=eq.true&order=created_at.desc&limit=50';
  const featuredSelectBasic =
    'posts?select=id,title,body,category_slug,created_at,is_featured&is_featured=eq.true&order=created_at.desc&limit=50';

  const [premiumAds, localNewsRaw, featuredWithPaper, classPosts, marketPosts] = await Promise.all([
    safeRest(
      'sponsors?select=id,business_name,category,city,description,website_url,discount_text,tier,listing_type,status&listing_type=eq.banner&status=eq.approved&tier=eq.premium&order=created_at.desc&limit=2'
    ),
    safeRest(
      'local_news?select=id,title,source,url,published_at,is_active&is_active=eq.true&order=published_at.desc&limit=20'
    ),
    safeRest(featuredSelectWithPaper),
    safeRest(
      'posts?select=id,title,created_at&category_slug=eq.classes&order=created_at.desc&limit=6'
    ),
    safeRest(
      'posts?select=id,title,created_at&category_slug=eq.market&order=created_at.desc&limit=6'
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
    marketPosts,
  };
}

function padAds(ads) {
  const rows = Array.isArray(ads) ? [...ads] : [];
  while (rows.length < 2) rows.push(null);
  return rows.slice(0, 2);
}

function SimpleRows({ posts, empty }) {
  if (!posts?.length) {
    return <div className="wf-empty">{empty}</div>;
  }
  return (
    <ul className="wf-list">
      {posts.map((post) => (
        <li key={post.id}>
          <Link href={`/post/${post.id}`} className="wf-list-row">
            <span className="wf-list-title">{post.title}</span>
            <time className="wf-list-date">{formatDate(post.created_at)}</time>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const { premiumAds, localNews, featuredPost, featuredPoolCount, classPosts, marketPosts } =
    await getHomeData();
  const ads = padAds(premiumAds);
  const cat = featuredPost ? getCategory(featuredPost.category_slug) : null;
  const paper = featuredPost ? stationeryClassName(featuredPost.stationery_id) : '';
  const bodyText = featuredPost ? letterBody(featuredPost.body) : '';

  return (
    <div className="container home-page">
      {/* 1구역 — 특별광고 50:50 */}
      <section className="wf-ads" aria-label="특별광고">
        {ads.map((ad, idx) => {
          if (!ad) {
            return (
              <div key={`ad-empty-${idx}`} className="wf-ads-card premium-ad-card wf-ads-card--empty">
                <div className="wf-ads-kicker">Premium</div>
                <div className="wf-ads-name wf-ads-name--placeholder">특별광고</div>
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
              {ad.description ? <p className="wf-ads-desc">{excerpt(ad.description, 90)}</p> : null}
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

      {/* 2구역 — 지역뉴스 / 오늘의 좋은글 (하루 1편 편지지) */}
      <section className="wf-mid" aria-label="지역뉴스와 좋은글">
        <LocalNewsPanel items={localNews || []} />

        <div className="wf-box wf-featured">
          <div className="panel-header">
            <h2 className="panel-title">좋은 글</h2>
            <Link href="/board/free?tag=featured" className="panel-more">
              더보기
            </Link>
          </div>
          {featuredPost ? (
            <Link
              href={`/post/${featuredPost.id}`}
              className={`wf-featured-letter${paper ? ` ${paper}` : ' letter-paper letter-paper--cream-lined'}`}
            >
              <div className="wf-featured-letter-top">
                <span className="wf-featured-today">오늘의 글</span>
                <div className="wf-featured-meta">
                  <span>{cat?.nameKo || featuredPost.category_slug || '게시판'}</span>
                  <time>{formatDate(featuredPost.created_at)}</time>
                </div>
              </div>
              <div className="wf-featured-name">{featuredPost.title}</div>
              {bodyText ? <p className="wf-featured-letter-body">{bodyText}</p> : null}
              {featuredPoolCount > 1 ? (
                <span className="wf-featured-letter-foot">
                  체크된 좋은글 {featuredPoolCount}편 중 · 매일 다른 글이 바뀝니다
                </span>
              ) : null}
            </Link>
          ) : (
            <div className="wf-empty wf-empty--grow">
              아직 홈에 올린 좋은글이 없습니다. 글쓰기에서 「좋은글」선택 후 「홈에 표시」를
              체크하세요. 체크한 글 중 하루에 한 편이 편지지로 보입니다.
            </div>
          )}
        </div>
      </section>

      {/* 3구역 — 수업/교육 / 중고장터 */}
      <section className="wf-box wf-bottom" aria-label="수업/교육과 중고장터">
        <div className="wf-bottom-col classes-latest">
          <div className="panel-header">
            <h2 className="panel-title">수업/교육 최신 글</h2>
            <Link href="/board/classes" className="panel-more">
              더보기
            </Link>
          </div>
          <SimpleRows posts={classPosts} empty="수업/교육 게시글이 아직 없습니다." />
        </div>
        <div className="wf-bottom-divider" aria-hidden="true" />
        <div className="wf-bottom-col market-latest">
          <div className="panel-header">
            <h2 className="panel-title">중고 장터 최신글</h2>
            <Link href="/board/market" className="panel-more">
              더보기
            </Link>
          </div>
          <SimpleRows posts={marketPosts} empty="중고장터 게시글이 아직 없습니다." />
        </div>
      </section>
    </div>
  );
}
