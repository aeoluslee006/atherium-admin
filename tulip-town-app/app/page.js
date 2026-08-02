import Link from 'next/link';
import { CATEGORIES, getCategory } from '../lib/categories';
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

function excerpt(text, max = 90) {
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
  const [premiumAds, localNews, featuredPosts, clubPosts, marketPosts, latestPosts] =
    await Promise.all([
      // sponsors only — never mixed with posts
      safeRest(
        'sponsors?select=id,business_name,category,city,description,website_url,discount_text,tier,listing_type,status&listing_type=eq.banner&status=eq.approved&tier=eq.premium&order=created_at.desc&limit=2'
      ),
      safeRest(
        'local_news?select=id,title,source,url,published_at,is_active&is_active=eq.true&order=published_at.desc&limit=4'
      ),
      safeRest(
        'posts?select=id,title,body,category_slug,created_at,is_featured&is_featured=eq.true&order=created_at.desc&limit=10'
      ),
      safeRest(
        'posts?select=id,title,created_at&category_slug=eq.clubs&order=created_at.desc&limit=5'
      ),
      safeRest(
        'posts?select=id,title,created_at&category_slug=eq.market&order=created_at.desc&limit=5'
      ),
      safeRest(
        'posts?select=id,title,category_slug,city,is_pinned,created_at&order=is_pinned.desc,created_at.desc&limit=12'
      ),
    ]);

  return { premiumAds, localNews, featuredPosts, clubPosts, marketPosts, latestPosts };
}

function newsSlots(localNews) {
  const rows = Array.isArray(localNews) ? localNews : [];
  return Array.from({ length: 4 }, (_, i) => rows[i] || null);
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
  const { premiumAds, localNews, featuredPosts, clubPosts, marketPosts, latestPosts } =
    await getHomeData();
  const ads = Array.isArray(premiumAds) ? premiumAds.slice(0, 2) : [];
  const slots = newsSlots(localNews);

  return (
    <div className="container home-page">
      {/* 1구역 — 특별광고 50:50 (0개면 숨김) */}
      {ads.length > 0 ? (
        <section
          className={`wf-ads${ads.length === 1 ? ' wf-ads--one' : ''}`}
          aria-label="특별광고"
        >
          {ads.map((ad, idx) => {
            const body = (
              <>
                {ad.discount_text ? (
                  <span className="wf-ads-badge">{ad.discount_text}</span>
                ) : null}
                <div className="wf-ads-kicker">특별광고</div>
                <div className="wf-ads-name">{ad.business_name}</div>
                <div className="wf-ads-meta">
                  {[ad.category, ad.city].filter(Boolean).join(' · ')}
                </div>
                {ad.description ? (
                  <p className="wf-ads-desc">{excerpt(ad.description, 90)}</p>
                ) : null}
              </>
            );
            return ad.website_url ? (
              <a
                key={ad.id}
                href={ad.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`wf-ads-card wf-ads-card--${idx + 1}`}
              >
                {body}
              </a>
            ) : (
              <div key={ad.id} className={`wf-ads-card wf-ads-card--${idx + 1}`}>
                {body}
              </div>
            );
          })}
        </section>
      ) : null}

      {/* 2구역 — 지역뉴스(좌) / 좋은글(우) */}
      <section className="wf-mid" aria-label="지역뉴스와 좋은글">
        <div className="wf-box wf-news">
          {slots.map((item, index) => {
            const n = index + 1;
            if (!item) {
              return (
                <div key={`empty-${n}`} className="wf-news-row wf-news-row--empty">
                  <div className="wf-news-thumb" aria-hidden="true" />
                  <div className="wf-news-content">
                    <div className="wf-news-placeholder">지역 뉴스 내용보기</div>
                  </div>
                </div>
              );
            }
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="wf-news-row"
              >
                <div className="wf-news-thumb" aria-hidden="true">
                  <span className="wf-news-thumb-source">{item.source || 'News'}</span>
                </div>
                <div className="wf-news-content">
                  <div className="wf-news-title">{item.title}</div>
                  <div className="wf-news-sub">
                    {[item.source, formatDate(item.published_at)].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <div className="wf-box wf-featured">
          <div className="wf-featured-title">좋은 글</div>
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
                        <p className="wf-featured-excerpt">{excerpt(post.body, 80)}</p>
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
        <div className="wf-bottom-col">
          <div className="wf-bottom-head">
            <h2>동호회 최신 글</h2>
            <Link href="/board/clubs">더보기</Link>
          </div>
          <SimpleRows posts={clubPosts} empty="동호회 게시글이 아직 없습니다." />
        </div>
        <div className="wf-bottom-divider" aria-hidden="true" />
        <div className="wf-bottom-col">
          <div className="wf-bottom-head">
            <h2>중고 장터 최신글</h2>
            <Link href="/board/market">더보기</Link>
          </div>
          <SimpleRows posts={marketPosts} empty="중고장터 게시글이 아직 없습니다." />
        </div>
      </section>

      {/* 게시판 그리드 + 최신 글 */}
      <section className="home-boards">
        <h2 className="section-title">게시판 · Boards</h2>
        <div className="category-grid">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/board/${cat.slug}`} className="category-card">
              <div className="ko">{cat.nameKo}</div>
              <div className="en">{cat.nameEn}</div>
              <div className="desc">{cat.desc}</div>
            </Link>
          ))}
        </div>

        <h2 className="section-title">최신 글 · Latest posts</h2>
        <div className="card">
          {latestPosts?.length ? (
            latestPosts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`} className="post-row">
                <span className="post-title">
                  {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
                  {post.city ? <span className="city-tag">{post.city}</span> : null}
                  {post.title}
                </span>
                <span className="post-meta">{formatDate(post.created_at)}</span>
              </Link>
            ))
          ) : (
            <div className="empty-state">아직 게시글이 없습니다. 첫 글을 남겨보세요!</div>
          )}
        </div>
      </section>
    </div>
  );
}
