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

function excerpt(text, max = 80) {
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
      safeRest(
        'sponsors?select=id,business_name,category,city,description,website_url,discount_text,tier,listing_type,status&listing_type=eq.banner&status=eq.approved&tier=eq.premium&order=created_at.desc&limit=2'
      ),
      safeRest(
        'local_news?select=id,title,source,url,published_at,is_active&is_active=eq.true&order=published_at.desc&limit=4'
      ),
      safeRest(
        'posts?select=id,title,body,category_slug,created_at,is_featured&is_featured=eq.true&order=created_at.desc&limit=8'
      ),
      safeRest(
        'posts?select=id,title,created_at,category_slug&category_slug=eq.clubs&order=created_at.desc&limit=5'
      ),
      safeRest(
        'posts?select=id,title,created_at,category_slug&category_slug=eq.market&order=created_at.desc&limit=5'
      ),
      safeRest(
        'posts?select=id,title,category_slug,city,is_pinned,created_at&order=is_pinned.desc,created_at.desc&limit=12'
      ),
    ]);

  return { premiumAds, localNews, featuredPosts, clubPosts, marketPosts, latestPosts };
}

function PostList({ posts, emptyText }) {
  if (!posts?.length) {
    return <div className="empty-state home-empty">{emptyText}</div>;
  }
  return (
    <ul className="home-simple-list">
      {posts.map((post) => (
        <li key={post.id}>
          <Link href={`/post/${post.id}`} className="home-simple-item">
            <span className="home-simple-title">{post.title}</span>
            <time className="home-simple-date">{formatDate(post.created_at)}</time>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const { premiumAds, localNews, featuredPosts, clubPosts, marketPosts, latestPosts } =
    await getHomeData();

  return (
    <div className="container home-page">
      {/* 1구역 — 특별광고 50:50 */}
      {premiumAds?.length ? (
        <section className="home-premium" aria-label="특별광고">
          <div className="home-premium-label">
            <span className="home-premium-kicker">SPECIAL ADS</span>
            <span>특별광고</span>
          </div>
          <div
            className={`home-premium-pair${premiumAds.length === 1 ? ' home-premium-pair--single' : ''}`}
          >
            {premiumAds.map((ad) => {
              const inner = (
                <>
                  {ad.discount_text ? (
                    <span className="home-discount-badge">{ad.discount_text}</span>
                  ) : (
                    <span className="home-premium-tag">PREMIUM</span>
                  )}
                  <div className="home-premium-name">{ad.business_name}</div>
                  <div className="home-premium-meta">
                    {[ad.category, ad.city].filter(Boolean).join(' · ')}
                  </div>
                  {ad.description ? (
                    <p className="home-premium-desc">{excerpt(ad.description, 72)}</p>
                  ) : null}
                </>
              );
              return ad.website_url ? (
                <a
                  key={ad.id}
                  href={ad.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-premium-card"
                >
                  {inner}
                </a>
              ) : (
                <div key={ad.id} className="home-premium-card">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* 2구역 — 지역뉴스(좌 ~60%) / 좋은글(우 ~40%) */}
      <section className="home-duo home-duo--news-featured" aria-label="지역뉴스와 좋은글">
        <div className="home-panel home-news-panel">
          <div className="home-panel-head">
            <h2 className="section-title">지역뉴스 · Local News</h2>
            <span className="home-panel-hint">West Michigan</span>
          </div>
          {localNews?.length ? (
            <ul className="home-news-stack">
              {localNews.map((item, index) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home-news-row"
                  >
                    <div className="home-news-thumb" aria-hidden="true">
                      <span className="home-news-num">뉴스{index + 1}</span>
                    </div>
                    <div className="home-news-body">
                      <div className="home-news-title">{item.title}</div>
                      <div className="home-news-meta">
                        <span>{item.source || 'News'}</span>
                        <span aria-hidden="true">·</span>
                        <time>{formatDate(item.published_at)}</time>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state home-empty">등록된 지역뉴스가 없습니다.</div>
          )}
        </div>

        <div className="home-panel home-featured-panel">
          <div className="home-panel-head">
            <h2 className="section-title">좋은글 · Featured</h2>
            <span className="home-panel-hint">추천</span>
          </div>
          {featuredPosts?.length ? (
            <ul className="home-featured-list">
              {featuredPosts.map((post) => {
                const cat = getCategory(post.category_slug);
                return (
                  <li key={post.id}>
                    <Link href={`/post/${post.id}`} className="home-featured-item">
                      <div className="home-featured-top">
                        <span className="home-cat-chip">
                          {cat?.nameKo || post.category_slug || '게시판'}
                        </span>
                        <time className="home-date">{formatDate(post.created_at)}</time>
                      </div>
                      <div className="home-featured-title">{post.title}</div>
                      {post.body ? (
                        <p className="home-featured-excerpt">{excerpt(post.body, 72)}</p>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty-state home-empty">아직 지정된 좋은글이 없습니다.</div>
          )}
        </div>
      </section>

      {/* 3구역 — 동호회 / 중고장터 50:50 */}
      <section className="home-duo home-duo--boards" aria-label="동호회와 중고장터">
        <div className="home-panel">
          <div className="home-panel-head">
            <h2 className="section-title">동호회 · Clubs</h2>
            <Link href="/board/clubs" className="home-aside-link">
              더보기
            </Link>
          </div>
          <PostList posts={clubPosts} emptyText="동호회 게시글이 아직 없습니다." />
        </div>
        <div className="home-panel">
          <div className="home-panel-head">
            <h2 className="section-title">중고장터 · Marketplace</h2>
            <Link href="/board/market" className="home-aside-link">
              더보기
            </Link>
          </div>
          <PostList posts={marketPosts} emptyText="중고장터 게시글이 아직 없습니다." />
        </div>
      </section>

      {/* 기존 — 카테고리 그리드 + 최신 글 */}
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
          <Link href="/directory" className="category-card">
            <div className="ko">업체 디렉토리</div>
            <div className="en">Business Directory</div>
            <div className="desc">한인 업체 · Local Korean businesses</div>
          </Link>
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
