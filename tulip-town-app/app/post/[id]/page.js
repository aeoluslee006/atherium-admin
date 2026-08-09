import Link from 'next/link';
import CommentForm from '../../../components/CommentForm';
import HousingPhotoGallery from '../../../components/HousingPhotoGallery';
import { getCategory } from '../../../lib/categories';
import { getFreeBoardTagLabel } from '../../../lib/freeBoardTags';
import { getHousingTagLabel, getHousingTypeLabel } from '../../../lib/housingTags';
import { formatJobRoles, getJobTagLabel } from '../../../lib/jobTags';
import { getMarketTagLabel } from '../../../lib/marketTags';
import {
  collectPostImages,
  stripImagesFromHtml,
} from '../../../lib/postImages';
import {
  getSampleHousingPost,
  isSampleHousingPostId,
} from '../../../lib/sampleHousingPost';
import {
  getSampleJobsPost,
  isSampleJobsPostId,
} from '../../../lib/sampleJobsPost';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

function isHtmlBody(body) {
  return /<\/?[a-z][\s\S]*>/i.test(String(body || ''));
}

function sanitizePostHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function formatPostDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return '';
  }
}

async function safeRest(path) {
  try {
    return await supabaseRest(path);
  } catch {
    return [];
  }
}

export default async function PostPage({ params }) {
  let post = null;
  let comments = [];
  let authorLabel = '';
  let prevPost = null;
  let nextPost = null;

  try {
    if (isSampleHousingPostId(params.id)) {
      post = getSampleHousingPost();
      authorLabel = '예시';
    } else if (isSampleJobsPostId(params.id)) {
      post = getSampleJobsPost();
      authorLabel = '예시';
    } else {
      const rows = await supabaseRest(
        `posts?select=*&id=eq.${encodeURIComponent(params.id)}&limit=1`
      );
      post = rows?.[0] || null;
    }
    if (post && !isSampleHousingPostId(params.id) && !isSampleJobsPostId(params.id)) {
      comments = await safeRest(
        `comments?select=*&post_id=eq.${encodeURIComponent(params.id)}&order=created_at.asc`
      );
      if (post.author_id) {
        const authors = await safeRest(
          `profiles?select=username,display_name&id=eq.${encodeURIComponent(post.author_id)}&limit=1`
        );
        const author = authors?.[0];
        authorLabel = author?.username || author?.display_name || '';
      }

      // Best-effort view increment (requires market_board_schema.sql)
      try {
        const nextCount = await supabaseRest('rpc/increment_post_views', {
          method: 'POST',
          body: JSON.stringify({ p_id: post.id }),
        });
        if (typeof nextCount === 'number') {
          post.view_count = nextCount;
        }
      } catch {
        // ignore until SQL is applied
      }

      if (
        (post.category_slug === 'market' ||
          post.category_slug === 'jobs' ||
          post.category_slug === 'housing') &&
        post.created_at
      ) {
        const slug = post.category_slug;
        const newer = await safeRest(
          `posts?select=id,title,created_at&category_slug=eq.${slug}&created_at=gt.${encodeURIComponent(
            post.created_at
          )}&order=created_at.asc&limit=1`
        );
        const older = await safeRest(
          `posts?select=id,title,created_at&category_slug=eq.${slug}&created_at=lt.${encodeURIComponent(
            post.created_at
          )}&order=created_at.desc&limit=1`
        );
        nextPost = newer?.[0] || null;
        prevPost = older?.[0] || null;
      }
    }
  } catch {
    post = null;
  }

  if (!post) {
    return (
      <div className="container">
        <div className="card empty-state">게시글을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const category = getCategory(post.category_slug);
  const isMarket = post.category_slug === 'market';
  const isJobs = post.category_slug === 'jobs';
  const isHousing = post.category_slug === 'housing';
  const freeTagLabel = post.category_slug === 'free' ? getFreeBoardTagLabel(post.subcategory) : '';
  const marketTagLabel = isMarket ? getMarketTagLabel(post.subcategory) : '';
  const jobTagLabel = isJobs ? getJobTagLabel(post.subcategory) : '';
  const housingTagLabel = isHousing ? getHousingTagLabel(post.subcategory) : '';
  const housingTypeLabel = isHousing ? getHousingTypeLabel(post.housing_type) : '';
  const htmlBody = isHtmlBody(post.body);

  const housingSpecs = isHousing
    ? [
        ['구분', housingTagLabel || '—'],
        ['유형', housingTypeLabel || '—'],
        ['월세/가격', post.rent_price_text || '—'],
        ['보증금', post.deposit_text || '—'],
        ['침실/욕실', [post.beds && `${post.beds} bed`, post.baths && `${post.baths} bath`].filter(Boolean).join(' · ') || '—'],
        ['주소', post.address_text || '—'],
        ['지역', post.city || '—'],
        ['입주', post.available_text || '—'],
        ['연락처', post.contact_text || '—'],
      ]
    : [];

  const hasHousingLocation = Boolean(post.address_text || post.city);

  const jobContact =
    [post.contact_name, post.contact_phone, post.contact_email].filter(Boolean).join(' · ') ||
    post.contact_text ||
    '';
  const jobSpecs = isJobs
    ? [
        ['구분', jobTagLabel || '—'],
        ['회사', post.company_name || '—'],
        ['급여/조건', post.pay_text || '—'],
        ['직종', formatJobRoles(post.job_roles) || '—'],
        ['지역', post.city || '—'],
        ['주소', post.address_text || '—'],
        ['연락처', jobContact || '—'],
      ].filter(([, value]) => value && value !== '—')
    : [];

  const housingImages = isHousing ? collectPostImages(post) : [];
  const housingBodyHtml =
    isHousing && housingImages.length
      ? stripImagesFromHtml(sanitizePostHtml(post.body))
      : sanitizePostHtml(post.body);
  const housingBodyPlain = String(
    isHousing && housingImages.length ? stripImagesFromHtml(post.body) : post.body || ''
  )
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const showHousingTextBody = !isHousing || housingBodyPlain.length > 0;

  return (
    <div className="container">
      <div className="row-between">
        <div>
          <div className="hint-text" style={{ marginBottom: 6 }}>
            {category ? (
              <Link href={`/board/${category.slug}`}>
                {isMarket || isJobs || isHousing
                  ? category.nameKo
                  : `${category.nameKo} · ${category.nameEn}`}
              </Link>
            ) : (
              post.category_slug
            )}
          </div>

          {isJobs ? (
            <div className="job-detail-head">
              <div className="jobs-logo job-detail-logo" aria-hidden="true">
                {post.company_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.company_logo} alt="" />
                ) : (
                  <span className="jobs-logo-fallback">
                    {String(post.company_name || post.title || 'J')
                      .trim()
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                {post.company_name ? <div className="job-detail-company">{post.company_name}</div> : null}
                <h2 className="section-title" style={{ marginBottom: 4 }}>
                  {jobTagLabel ? (
                    <span className={`job-badge job-badge--${post.subcategory}`}>{jobTagLabel}</span>
                  ) : null}{' '}
                  {post.title}
                </h2>
                {post.pay_text ? <div className="job-detail-pay">{post.pay_text}</div> : null}
              </div>
            </div>
          ) : (
            <h2 className="section-title" style={{ marginBottom: 4 }}>
              {post.is_pinned ? <span className="post-pinned">[공지]</span> : null}
              {freeTagLabel ? <span className="subcat-badge">{freeTagLabel}</span> : null}
              {marketTagLabel ? (
                <span className={`market-badge market-badge--${post.subcategory}`}>{marketTagLabel}</span>
              ) : null}
              {housingTagLabel ? (
                <span className={`housing-badge housing-badge--${post.subcategory}`}>{housingTagLabel}</span>
              ) : null}{' '}
              {post.title}
            </h2>
          )}

          {isHousing && post.rent_price_text ? (
            <div className="housing-detail-price">{post.rent_price_text}</div>
          ) : null}

          <div className="hint-text post-meta-bar">
            {authorLabel ? <span className="post-author">{authorLabel}</span> : null}
            {typeof post.view_count === 'number' ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>조회 {post.view_count}</span>
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            <span>댓글 {comments?.length || 0}</span>
            {post.city && !isHousing ? (
              <>
                <span aria-hidden="true"> · </span>
                <span className="city-tag">{post.city}</span>
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            <span>{formatPostDate(post.created_at)}</span>
          </div>
        </div>
        {category ? (
          <Link href={`/board/${category.slug}`} className="btn btn-outline">
            목록
          </Link>
        ) : null}
      </div>

      {isHousing && (housingSpecs.length || housingImages.length) ? (
        <div className={`housing-detail-split${housingImages.length ? ' has-photos' : ''}`}>
          <div className="housing-detail-info">
            {hasHousingLocation ? (
              <aside className="housing-detail-aside">
                <div className="housing-aside-label">위치</div>
                {post.address_text ? (
                  <div className="housing-aside-address">{post.address_text}</div>
                ) : null}
                {post.city ? <div className="housing-aside-city">{post.city}</div> : null}
                {post.available_text ? (
                  <div className="housing-aside-meta">입주 {post.available_text}</div>
                ) : null}
              </aside>
            ) : null}
            {housingSpecs.length ? (
              <div className="card housing-spec-card">
                <h3 className="housing-spec-title">매물 정보</h3>
                <dl className="housing-spec-list">
                  {housingSpecs
                    .filter(([label]) => {
                      // Location already shown in aside when present
                      if (!hasHousingLocation) return true;
                      return label !== '주소' && label !== '지역' && label !== '입주';
                    })
                    .map(([label, value]) => (
                      <div key={label} className="housing-spec-row">
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ) : null}
          </div>
          {housingImages.length ? (
            <div className="housing-detail-media">
              <HousingPhotoGallery images={housingImages} title={post.title || '매물 사진'} />
            </div>
          ) : null}
        </div>
      ) : null}

      {isJobs && jobSpecs.length ? (
        <div className="card housing-spec-card job-spec-card">
          <h3 className="housing-spec-title">채용 정보</h3>
          <dl className="housing-spec-list">
            {jobSpecs.map(([label, value]) => (
              <div key={label} className="housing-spec-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {isHousing ? (
        showHousingTextBody ? (
          htmlBody ? (
            <div
              className="card post-body-html"
              style={{ marginBottom: 24 }}
              dangerouslySetInnerHTML={{ __html: housingBodyHtml }}
            />
          ) : (
            <div className="card" style={{ whiteSpace: 'pre-wrap', marginBottom: 24 }}>
              {housingBodyPlain}
            </div>
          )
        ) : null
      ) : htmlBody ? (
        <div
          className="card post-body-html"
          style={{ marginBottom: 24 }}
          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.body) }}
        />
      ) : (
        <div className="card" style={{ whiteSpace: 'pre-wrap', marginBottom: 24 }}>
          {post.body}
        </div>
      )}

      {(isMarket || isJobs || isHousing) && (prevPost || nextPost) ? (
        <div className="card market-adjacent">
          {prevPost ? (
            <Link href={`/post/${prevPost.id}`} className="market-adjacent-row">
              <span className="market-adjacent-label">이전글</span>
              <span className="market-adjacent-title">{prevPost.title}</span>
            </Link>
          ) : null}
          {nextPost ? (
            <Link href={`/post/${nextPost.id}`} className="market-adjacent-row">
              <span className="market-adjacent-label">다음글</span>
              <span className="market-adjacent-title">{nextPost.title}</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <h3 className="section-title">댓글 · Comments</h3>
      <div className="card">
        {isSampleHousingPostId(post.id) || isSampleJobsPostId(post.id) ? (
          <div className="empty-state">예시 글에는 댓글을 남길 수 없습니다.</div>
        ) : (
          <>
            {comments?.length ? (
              comments.map((c) => (
                <div key={c.id} className="comment">
                  <div className="comment-meta">
                    {c.created_at ? new Date(c.created_at).toLocaleString('ko-KR') : ''}
                  </div>
                  <div>{c.body}</div>
                </div>
              ))
            ) : (
              <div className="empty-state">아직 댓글이 없습니다.</div>
            )}
            <CommentForm postId={post.id} />
          </>
        )}
      </div>
    </div>
  );
}
