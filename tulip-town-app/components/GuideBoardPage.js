import Link from 'next/link';
import SettlementGuideMap from './SettlementGuideMap';
import { getCategory } from '../lib/categories';
import { isValidSettlementCity } from '../lib/settlementTowns';
import { supabaseRest } from '../lib/supabaseRest';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export default async function GuideBoardPage({ searchParams = {} }) {
  const category = getCategory('guide');
  const rawCity = searchParams.city || '';
  const city = isValidSettlementCity(rawCity) ? rawCity : null;

  let posts = [];
  if (city) {
    try {
      posts = await supabaseRest(
        `posts?select=id,title,city,is_pinned,created_at&category_slug=eq.guide&city=eq.${encodeURIComponent(
          city
        )}&order=is_pinned.desc,created_at.desc`
      );
    } catch {
      posts = [];
    }
  }

  return (
    <div className="container guide-board-page">
      <header className="guide-board-head row-between">
        <div className="board-heading">
          <h2 className="section-title">
            {category.nameKo} · {category.nameEn}
          </h2>
          {category.desc ? <p className="board-heading-desc">{category.desc}</p> : null}
        </div>
        <Link
          href={city ? `/board/guide/new?city=${encodeURIComponent(city)}` : '/board/guide/new'}
          className="btn"
        >
          글쓰기
        </Link>
      </header>

      <SettlementGuideMap city={city} />

      {city ? (
        <div className="card guide-board-list">
          <div className="guide-board-list-head">
            <h3 className="guide-board-list-title">{city} 게시글</h3>
          </div>
          {posts?.length ? (
            posts.map((post) => (
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
            <div className="empty-state">아직 게시글이 없습니다.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
