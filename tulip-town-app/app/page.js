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

function excerpt(text, max = 96) {
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
  const [premiumAds, featuredPosts, localNews, standardSponsors, latestPosts] = await Promise.all([
    safeRest(
      'sponsors?select=id,business_name,category,city,description,website_url,discount_text,tier,listing_type,status&listing_type=eq.banner&status=eq.approved&tier=eq.premium&order=created_at.desc&limit=6'
    ),
    safeRest(
      'posts?select=id,title,body,category_slug,city,created_at,is_featured&is_featured=eq.true&order=created_at.desc&limit=8'
    ),
    safeRest(
      'local_news?select=id,title,source,url,published_at,is_active&is_active=eq.true&order=published_at.desc&limit=10'
    ),
    safeRest(
      'sponsors?select=id,business_name,category,city,description,website_url,discount_text,tier,status&status=eq.approved&tier=eq.standard&order=created_at.desc&limit=8'
    ),
    safeRest(
      'posts?select=id,title,category_slug,city,is_pinned,created_at&order=is_pinned.desc,created_at.desc&limit=12'
    ),
  ]);

  return { premiumAds, featuredPosts, localNews, standardSponsors, latestPosts };
}

export default async function HomePage() {
  const { premiumAds, featuredPosts, localNews, standardSponsors, latestPosts } = await getHomeData();

  return (
    <div className="container home-page">
      {/* 1. 주요 광고 — premium banner strip */}
      {premiumAds?.length ? (
        <section className="home-premium" aria-label="주요 광고">
          <div className="home-premium-label">
            <span className="home-premium-kicker">FEATURED ADS</span>
            <span>주요 광고</span>
          </div>
          <div className="home-premium-grid">
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

      {/* 2–4. 메인 2/3 + 스폰서 사이드바 1/3 */}
      <section className="home-split">
        <div className="home-main">
          <div className="home-panel">
            <div className="home-panel-head">
              <h2 className="section-title">좋은글 · Featured</h2>
              <span className="home-panel-hint">관리자가 고른 추천 글</span>
            </div>
            {featuredPosts?.length ? (
              <ul className="home-featured-list">
                {featuredPosts.map((post) => {
                  const cat = getCategory(post.category_slug);
                  return (
                    <li key={post.id}>
                      <Link href={`/post/${post.id}`} className="home-featured-item">
                        <div className="home-featured-top">
                          <span className="home-cat-chip">{cat?.nameKo || post.category_slug || '게시판'}</span>
                          <time className="home-date">{formatDate(post.created_at)}</time>
                        </div>
                        <div className="home-featured-title">{post.title}</div>
                        <p className="home-featured-excerpt">{excerpt(post.body, 96)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty-state home-empty">아직 지정된 좋은글이 없습니다.</div>
            )}
          </div>

          <div className="home-panel">
            <div className="home-panel-head">
              <h2 className="section-title">지역뉴스 · Local News</h2>
              <span className="home-panel-hint">West Michigan 소식</span>
            </div>
            {localNews?.length ? (
              <ul className="home-news-list">
                {localNews.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="home-news-item"
                    >
                      <div className="home-news-title">{item.title}</div>
                      <div className="home-news-meta">
                        <span>{item.source || 'News'}</span>
                        <span aria-hidden="true">·</span>
                        <time>{formatDate(item.published_at)}</time>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state home-empty">등록된 지역뉴스가 없습니다.</div>
            )}
          </div>
        </div>

        <aside className="home-aside" aria-label="스폰서">
          <div className="home-panel home-aside-panel">
            <div className="home-panel-head">
              <h2 className="section-title">스폰서 · Sponsors</h2>
              <Link href="/directory" className="home-aside-link">
                전체 보기
              </Link>
            </div>
            {standardSponsors?.length ? (
              <div className="home-sponsor-stack">
                {standardSponsors.map((biz) => (
                  <div key={biz.id} className="sponsor-card home-sponsor-card">
                    <div className="sponsor-badge">Sponsored</div>
                    <div className="ko" style={{ marginTop: 8 }}>
                      {biz.business_name}
                    </div>
                    <div className="en">{biz.category || 'Business'}</div>
                    <div className="desc">
                      {biz.city ? `${biz.city} · ` : ''}
                      {biz.discount_text || biz.description || biz.website_url || ''}
                    </div>
                    {biz.website_url ? (
                      <a
                        href={biz.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="home-sponsor-web"
                      >
                        웹사이트
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state home-empty">
                등록된 스폰서가 없습니다.
                <div style={{ marginTop: 10 }}>
                  <Link href="/directory/new" className="btn btn-outline">
                    업체 등록
                  </Link>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* 기존 게시판 그리드 + 최신 글 */}
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
                <span className="post-meta">
                  {formatDate(post.created_at)}
                </span>
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
