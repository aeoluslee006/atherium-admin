import Link from 'next/link';
import LocalNewsPanel from '../components/LocalNewsPanel';
import { getCategory } from '../lib/categories';
import { isExampleLocalNews } from '../lib/localNews';
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

async function safeRest(path) {
  try {
    return await supabaseRest(path);
  } catch {
    return [];
  }
}

async function getHomeData() {
  const [premiumAds, localNewsRaw, featuredPosts, clubPosts, marketPosts] = await Promise.all([
    safeRest(
      'sponsors?select=id,business_name,category,city,description,website_url,discount_text,tier,listing_type,status&listing_type=eq.banner&status=eq.approved&tier=eq.premium&order=created_at.desc&limit=2'
    ),
    safeRest(
      'local_news?select=id,title,source,url,published_at,is_active&is_active=eq.true&order=published_at.desc&limit=20'
    ),
    safeRest(
      'posts?select=id,title,body,category_slug,created_at,is_featured&is_featured=eq.true&order=created_at.desc&limit=10'
    ),
    safeRest(
      'posts?select=id,title,created_at&category_slug=eq.clubs&order=created_at.desc&limit=6'
    ),
    safeRest(
      'posts?select=id,title,created_at&category_slug=eq.market&order=created_at.desc&limit=6'
    ),
  ]);

  const localNews = (Array.isArray(localNewsRaw) ? localNewsRaw : [])
    .filter((row) => !isExampleLocalNews(row))
    .slice(0, 4);

  return { premiumAds, localNews, featuredPosts, clubPosts, marketPosts };
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
  const { premiumAds, localNews, featuredPosts, clubPosts, marketPosts } = await getHomeData();
  const ads = padAds(premiumAds);

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

      {/* 2구역 — 지역뉴스(축소판→전체) / 좋은글 */}
      <section className="wf-mid" aria-label="지역뉴스와 좋은글">
        <LocalNewsPanel items={localNews || []} />

        <div className="wf-box wf-featured">
          <div className="panel-header">
            <h2 className="panel-title">좋은 글</h2>
          </div>
          {featuredPosts?.length ? (
            <ul className="wf-featured-list">
              {featuredPosts.map((post) => {
                const cat = getCategory(post.category_slug);
                return (
                  <li key={post.id}>
                    <Link href={`/post/${post.id}`} className="wf-featured-row">
                      <div className="wf-featured-meta">
                        <span>{cat?.nameKo || post.category_slug || '게시판'}</span>
                        <time>{formatDate(post.created_at)}</time>
                      </div>
                      <div className="wf-featured-name">{post.title}</div>
                      {post.body ? (
                        <p className="wf-featured-excerpt">{excerpt(post.body, 90)}</p>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="wf-empty wf-empty--grow">아직 지정된 좋은글이 없습니다.</div>
          )}
        </div>
      </section>

      {/* 3구역 — 동호회 / 중고장터 */}
      <section className="wf-box wf-bottom" aria-label="동호회와 중고장터">
        <div className="wf-bottom-col clubs-latest">
          <div className="panel-header">
            <h2 className="panel-title">동호회 최신 글</h2>
            <Link href="/board/clubs" className="panel-more">
              더보기
            </Link>
          </div>
          <SimpleRows posts={clubPosts} empty="동호회 게시글이 아직 없습니다." />
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
