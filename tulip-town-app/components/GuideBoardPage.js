import Link from 'next/link';
import { getCategory } from '../lib/categories';
import {
  canonicalCityName,
  getHub,
  getTown,
  guideBoardHref,
} from '../lib/settlementTowns';
import { supabaseRest } from '../lib/supabaseRest';
import { HubZoomMap, MichiganStateMap } from './GuideMichiganMap';

const GUIDE_SLUG = 'guide';

async function loadGuidePosts(city) {
  const cityFilter = city ? `&city=eq.${encodeURIComponent(city)}` : '';
  try {
    return await supabaseRest(
      `posts?select=id,title,city,is_pinned,created_at&category_slug=eq.${GUIDE_SLUG}${cityFilter}&order=is_pinned.desc,created_at.desc`
    );
  } catch {
    return [];
  }
}

function GuideHeading({ category, cityName, writeHref }) {
  return (
    <div className="row-between">
      <div className="board-heading">
        <h2 className="section-title">
          {category.nameKo} · {category.nameEn}
          {cityName ? ` · ${cityName}` : ''}
        </h2>
        {category.desc ? <p className="board-heading-desc">{category.desc}</p> : null}
      </div>
      <Link href={writeHref} className="btn">
        글쓰기
      </Link>
    </div>
  );
}

function GuideCrumbs({ items }) {
  return (
    <nav className="guide-crumbs" aria-label="정착 가이드 위치">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={item.label} className="guide-crumb">
            {i > 0 ? <span className="guide-crumb-sep" aria-hidden="true">›</span> : null}
            {last || !item.href ? (
              <span className="guide-crumb-current">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function GuidePostList({ posts }) {
  return (
    <div className="card">
      {posts?.length ? (
        posts.map((post) => (
          <Link key={post.id} href={`/post/${post.id}`} className="post-row">
            <span className="post-title">
              {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
              {post.city ? <span className="city-tag">{post.city}</span> : null}
              {post.title}
            </span>
            <span className="post-meta">
              {post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR') : ''}
            </span>
          </Link>
        ))
      ) : (
        <div className="empty-state">아직 게시글이 없습니다. 첫 글을 남겨보세요!</div>
      )}
    </div>
  );
}

export default async function GuideBoardPage({ searchParams = {} }) {
  const category = getCategory(GUIDE_SLUG);
  const cityName = canonicalCityName(searchParams.city);
  const hubName = canonicalCityName(searchParams.hub);
  const hub = hubName ? getHub(hubName) : null;
  const town = cityName ? getTown(cityName) : null;

  if (cityName && town) {
    const posts = await loadGuidePosts(cityName);
    const list = Array.isArray(posts) ? posts : [];
    const parentHub = town.hubName ? getHub(town.hubName) : null;
    const crumbs = [{ label: '미시간', href: guideBoardHref() }];
    if (parentHub?.satellites?.length) {
      crumbs.push({
        label: `${parentHub.name} 주변`,
        href: guideBoardHref({ hub: parentHub.name }),
      });
    }
    crumbs.push({ label: cityName });

    return (
      <div className="container">
        <GuideHeading
          category={category}
          cityName={cityName}
          writeHref={`/board/guide/new?city=${encodeURIComponent(cityName)}`}
        />
        <GuideCrumbs items={crumbs} />
        <GuidePostList posts={list} />
      </div>
    );
  }

  if (hub?.satellites?.length) {
    return (
      <div className="container">
        <GuideHeading category={category} writeHref="/board/guide/new" />
        <GuideCrumbs
          items={[{ label: '미시간', href: guideBoardHref() }, { label: `${hub.name} 주변` }]}
        />
        <div className="card guide-map-card">
          <HubZoomMap hub={hub} />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <GuideHeading category={category} writeHref="/board/guide/new" />
      <GuideCrumbs items={[{ label: '미시간' }]} />
      <div className="card guide-map-card">
        <MichiganStateMap />
      </div>
    </div>
  );
}
