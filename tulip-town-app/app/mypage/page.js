import Link from 'next/link';
import { redirect } from 'next/navigation';
import MemberTierBadge from '../../components/MemberTierBadge';
import MyPageAccountPanel from '../../components/MyPageAccountPanel';
import { CATEGORIES } from '../../lib/categories';
import {
  PRODUCT_LABELS,
  STATUS_LABELS,
  displayNameFromProfile,
  formatDateTime,
  formatJoinedDate,
  resolveMemberTier,
} from '../../lib/memberTier';
import { createServerSupabase } from '../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

function boardLabel(slug) {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  return cat?.nameKo || slug || '게시판';
}

function excerpt(text, max = 80) {
  const plain = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}…`;
}

export default async function MyPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/mypage');
  }

  let profile = null;
  {
    const full = await supabase
      .from('profiles')
      .select(
        'id, display_name, username, first_name, last_name, email, is_admin, is_moderator, account_type, post_count, last_post_at, created_at'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (full.error) {
      // Migration not applied yet — fall back to existing columns only.
      const basic = await supabase
        .from('profiles')
        .select('id, display_name, username, first_name, last_name, email, is_admin, created_at')
        .eq('id', user.id)
        .maybeSingle();
      profile = basic.data;
    } else {
      profile = full.data;
    }
  }

  // New columns may be missing until SQL migration is applied.
  const safeProfile = {
    ...(profile || { id: user.id }),
    is_admin: !!profile?.is_admin,
    is_moderator: !!profile?.is_moderator,
    account_type: profile?.account_type || 'individual',
    post_count: profile?.post_count ?? 0,
    last_post_at: profile?.last_post_at || null,
  };

  let subscriptions = [];
  const { data: subRows, error: subError } = await supabase
    .from('subscriptions')
    .select('id, product_type, status, period_start, period_end, created_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  if (!subError && Array.isArray(subRows)) {
    subscriptions = subRows;
  }

  let tier = resolveMemberTier(safeProfile, subscriptions);
  const { data: tierRow } = await supabase
    .from('member_tier_view')
    .select('tier')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (tierRow?.tier) {
    tier = tierRow.tier;
  }

  const { data: myPosts } = await supabase
    .from('posts')
    .select('id, title, category_slug, created_at, view_count')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const posts = Array.isArray(myPosts) ? myPosts : [];
  const postIds = posts.map((p) => p.id);
  const postTitleById = Object.fromEntries(posts.map((p) => [p.id, p.title]));

  let commentsOnMyPosts = [];
  if (postIds.length) {
    const { data: commentRows } = await supabase
      .from('comments')
      .select('id, post_id, body, author_id, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: false })
      .limit(40);
    commentsOnMyPosts = Array.isArray(commentRows) ? commentRows : [];
  }

  const commentAuthorIds = [...new Set(commentsOnMyPosts.map((c) => c.author_id).filter(Boolean))];
  const authorNameById = {};
  if (commentAuthorIds.length) {
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', commentAuthorIds);
    for (const a of authors || []) {
      authorNameById[a.id] = a.display_name || a.username || '회원';
    }
  }

  const name = displayNameFromProfile(safeProfile, user.email);
  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  return (
    <div className="container mypage">
      <header className="mypage-hero">
        <div className="mypage-hero-text">
          <p className="mypage-kicker">My Page</p>
          <h1 className="mypage-title">{name}</h1>
          <p className="mypage-meta">가입일 {formatJoinedDate(safeProfile.created_at)}</p>
        </div>
        <MemberTierBadge tier={tier} />
      </header>

      <MyPageAccountPanel
        initialNickname={safeProfile.display_name || name || ''}
        email={safeProfile.email || user.email || ''}
        username={safeProfile.username || ''}
        firstName={safeProfile.first_name || ''}
        lastName={safeProfile.last_name || ''}
      />

      {safeProfile.is_admin || safeProfile.is_moderator ? (
        <section className="mypage-section card" aria-labelledby="mypage-dir-title">
          <div className="mypage-section-head">
            <h2 id="mypage-dir-title">지면 광고 관리</h2>
            <span className="mypage-count">블랙</span>
          </div>
          <p className="mypage-list-sub" style={{ marginBottom: 12 }}>
            업체 디렉토리 맨 끝 <strong>+</strong> 탭에서 슬롯을 드래그해 새 페이지를 만들 수 있습니다.
          </p>
          <div className="mypage-empty-actions">
            <Link href="/directory" className="btn">
              디렉토리에서 추가
            </Link>
            <Link href="/mypage/directory-pages" className="btn btn-outline">
              배치 화면 열기
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mypage-section card" aria-labelledby="mypage-subs-title">
        <div className="mypage-section-head">
          <h2 id="mypage-subs-title">구독 현황</h2>
          <span className="mypage-count">{activeSubs.length}건 이용 중</span>
        </div>
        {subscriptions.length ? (
          <ul className="mypage-list">
            {subscriptions.map((sub) => (
              <li key={sub.id} className="mypage-list-row">
                <div>
                  <strong>{PRODUCT_LABELS[sub.product_type] || sub.product_type}</strong>
                  <p className="mypage-list-sub">
                    {STATUS_LABELS[sub.status] || sub.status}
                    {sub.period_end ? ` · 만료 ${formatJoinedDate(sub.period_end)}` : ''}
                  </p>
                </div>
                <span className={`mypage-status mypage-status--${sub.status || 'expired'}`}>
                  {STATUS_LABELS[sub.status] || sub.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mypage-empty">
            <p>구독 중인 상품이 없습니다.</p>
            <div className="mypage-empty-actions">
              <Link href="/shop" className="btn btn-outline">
                튤립가게 보기
              </Link>
              <Link href="/directory" className="btn btn-outline">
                업체 디렉토리
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="mypage-section card" aria-labelledby="mypage-posts-title">
        <div className="mypage-section-head">
          <h2 id="mypage-posts-title">내가 쓴 글</h2>
          <span className="mypage-count">{posts.length}편</span>
        </div>
        {posts.length ? (
          <ul className="mypage-list">
            {posts.map((post) => (
              <li key={post.id} className="mypage-list-row">
                <div>
                  <Link href={`/post/${post.id}`} className="mypage-post-link">
                    {post.title || '(제목 없음)'}
                  </Link>
                  <p className="mypage-list-sub">
                    {boardLabel(post.category_slug)} · {formatDateTime(post.created_at)}
                    {typeof post.view_count === 'number' ? ` · 조회 ${post.view_count}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mypage-empty">
            <p>아직 작성한 글이 없습니다.</p>
            <Link href="/board/free/new" className="btn btn-outline">
              글쓰기
            </Link>
          </div>
        )}
      </section>

      <section className="mypage-section card" aria-labelledby="mypage-comments-title">
        <div className="mypage-section-head">
          <h2 id="mypage-comments-title">내 글에 달린 댓글</h2>
          <span className="mypage-count">{commentsOnMyPosts.length}개</span>
        </div>
        {commentsOnMyPosts.length ? (
          <ul className="mypage-list">
            {commentsOnMyPosts.map((c) => (
              <li key={c.id} className="mypage-list-row mypage-list-row--stack">
                <p className="mypage-comment-body">{excerpt(c.body, 120)}</p>
                <p className="mypage-list-sub">
                  {authorNameById[c.author_id] || '회원'} · {formatDateTime(c.created_at)} ·{' '}
                  <Link href={`/post/${c.post_id}`}>
                    {postTitleById[c.post_id] || '원글 보기'}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mypage-empty">
            <p>내 글에 달린 댓글이 아직 없습니다.</p>
          </div>
        )}
      </section>

      <p className="mypage-footnote">
        닉네임·비밀번호는 이 페이지에서 변경할 수 있습니다. 글·댓글 수정은 각 게시글 화면에서 해 주세요.
      </p>
    </div>
  );
}
