import Link from 'next/link';
import { redirect } from 'next/navigation';
import ClassesBoardPage from '../../../components/ClassesBoardPage';
import FreeBoardPage from '../../../components/FreeBoardPage';
import GuideBoardPage from '../../../components/GuideBoardPage';
import HousingBoardPage from '../../../components/HousingBoardPage';
import JobsBoardPage from '../../../components/JobsBoardPage';
import MarketBoardPage from '../../../components/MarketBoardPage';
import LocalizedPostTitle from '../../../components/LocalizedPostTitle';
import { getCategory } from '../../../lib/categories';
import { createServerT, getServerLocale } from '../../../lib/i18n/server';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export default async function BoardPage({ params, searchParams }) {
  if (params.slug === 'clubs') {
    redirect('/board/classes');
  }
  if (params.slug === 'free') {
    return <FreeBoardPage searchParams={searchParams} />;
  }
  if (params.slug === 'market') {
    return <MarketBoardPage searchParams={searchParams} />;
  }
  if (params.slug === 'jobs') {
    return <JobsBoardPage searchParams={searchParams} />;
  }
  if (params.slug === 'housing') {
    return <HousingBoardPage searchParams={searchParams} />;
  }
  if (params.slug === 'classes') {
    return <ClassesBoardPage searchParams={searchParams} />;
  }
  if (params.slug === 'guide') {
    return <GuideBoardPage searchParams={searchParams} />;
  }

  const locale = getServerLocale();
  const t = createServerT(locale);
  const category = getCategory(params.slug);
  if (!category) {
    return (
      <div className="container">
        <div className="card empty-state">{t('board.notFound')}</div>
      </div>
    );
  }

  let posts = [];
  try {
    posts = await supabaseRest(
      `posts?select=id,title,title_en,city,is_pinned,created_at&category_slug=eq.${encodeURIComponent(
        params.slug
      )}&order=is_pinned.desc,created_at.desc`
    );
  } catch {
    try {
      posts = await supabaseRest(
        `posts?select=id,title,city,is_pinned,created_at&category_slug=eq.${encodeURIComponent(
          params.slug
        )}&order=is_pinned.desc,created_at.desc`
      );
    } catch {
      posts = [];
    }
  }

  const categoryTitle = locale === 'en' ? category.nameEn || category.nameKo : category.nameKo;

  return (
    <div className="container">
      <div className="row-between">
        <div className="board-heading">
          <h2 className="section-title">{categoryTitle}</h2>
          {category.desc ? <p className="board-heading-desc">{category.desc}</p> : null}
        </div>
        <Link href={`/board/${params.slug}/new`} className="btn">
          {t('board.write')}
        </Link>
      </div>
      <div className="card">
        {posts?.length ? (
          posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="post-row">
              <span className="post-title">
                {post.is_pinned ? <span className="post-pinned">[{t('board.pinned')}]</span> : null}
                {post.city ? <span className="city-tag">{post.city}</span> : null}
                <LocalizedPostTitle post={post} />
              </span>
              <span className="post-meta">
                {post.created_at
                  ? new Date(post.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR')
                  : ''}
              </span>
            </Link>
          ))
        ) : (
          <div className="empty-state">{t('board.emptyFirst')}</div>
        )}
      </div>
    </div>
  );
}
