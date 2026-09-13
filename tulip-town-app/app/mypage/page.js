import Link from 'next/link';
import { redirect } from 'next/navigation';
import MemberTierBadge from '../../components/MemberTierBadge';
import MyPageAccountPanel from '../../components/MyPageAccountPanel';
import MyPageAdminContact from '../../components/MyPageAdminContact';
import {
  IconAd,
  IconCard,
  IconChat,
  IconHeart,
  IconMail,
  IconPencil,
  IconPost,
  IconStore,
  IconUser,
} from '../../components/MyPageIcons';
import { CATEGORIES } from '../../lib/categories';
import {
  PRODUCT_LABELS,
  STATUS_LABELS,
  displayNameFromProfile,
  formatDateTime,
  formatJoinedDate,
  resolveMemberTier,
} from '../../lib/memberTier';
import { isLoginBlocked } from '../../lib/memberStatus';
import {
  SELLER_STATUS_LABEL,
  formatPriceCents,
  hasActiveShopSubscription,
} from '../../lib/sellerConstants';
import { productImageList } from '../../lib/shopCatalog';
import { loadFavoriteProducts } from '../../lib/shopFavorites';
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

function favoriteThumb(item) {
  return productImageList(item)[0] || '';
}

export default async function MyPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/mypage');

  let profile = null;
  {
    const full = await supabase
      .from('profiles')
      .select(
        'id, display_name, username, first_name, last_name, email, is_admin, is_moderator, account_type, post_count, last_post_at, created_at, status, promo_end_date'
      )
      .eq('id', user.id)
      .maybeSingle();
    if (full.error) {
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

  if (profile && isLoginBlocked(profile)) {
    redirect('/login?error=account_deleted');
  }

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
  if (!subError && Array.isArray(subRows)) subscriptions = subRows;

  let tier = resolveMemberTier(safeProfile, subscriptions);
  const { data: tierRow } = await supabase
    .from('member_tier_view')
    .select('tier')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (tierRow?.tier) tier = tierRow.tier;

  const { data: myPosts } = await supabase
    .from('posts')
    .select('id, title, category_slug, created_at, view_count')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
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
      .limit(20);
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

  let myDirectoryAds = [];
  {
    const fullAds = await supabase
      .from('directory_slot_ads')
      .select(
        'id,ad_title,status,period_end,is_special,special_queue_position,directory_slots(page_number,position_label,size_tier)'
      )
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (fullAds.error) {
      const basicAds = await supabase
        .from('directory_slot_ads')
        .select('id,ad_title,status,period_end,directory_slots(page_number,position_label,size_tier)')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      myDirectoryAds = Array.isArray(basicAds.data) ? basicAds.data : [];
    } else {
      myDirectoryAds = Array.isArray(fullAds.data) ? fullAds.data : [];
    }
  }

  const name = displayNameFromProfile(safeProfile, user.email);
  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  let shopSponsor = null;
  {
    const withKind = await supabase
      .from('sponsors')
      .select('id,business_name,status,plan_tier,product_limit,listing_type,seller_kind')
      .eq('listing_type', 'shop')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (withKind.error) {
      const basic = await supabase
        .from('sponsors')
        .select('id,business_name,status,plan_tier,product_limit,listing_type')
        .eq('listing_type', 'shop')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      shopSponsor = basic.data || null;
    } else {
      shopSponsor = withKind.data || null;
    }
  }

  const showShopManage =
    Boolean(shopSponsor) || hasActiveShopSubscription(subscriptions);
  const favoriteProducts = await loadFavoriteProducts();
  const isIndividualSeller = shopSponsor?.seller_kind === 'individual';

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

      <div className="mypage-shell">
        <nav className="mypage-side-nav" aria-label="마이페이지 메뉴">
          <p className="mypage-side-label">메뉴</p>
          <a href="#mypage-account" className="mypage-side-item">
            <span className="mypage-side-icon"><IconUser /></span>
            <span>내 정보</span>
          </a>
          <a href="#mypage-favorites" className="mypage-side-item">
            <span className="mypage-side-icon"><IconHeart /></span>
            <span>찜</span>
            {favoriteProducts.length ? <em>{favoriteProducts.length}</em> : null}
          </a>
          <a href="#mypage-shop" className="mypage-side-item">
            <span className="mypage-side-icon"><IconStore /></span>
            <span>가게</span>
          </a>
          <a href="#mypage-ads" className="mypage-side-item">
            <span className="mypage-side-icon"><IconAd /></span>
            <span>광고</span>
            {myDirectoryAds.length ? <em>{myDirectoryAds.length}</em> : null}
          </a>
          <a href="#mypage-subs" className="mypage-side-item">
            <span className="mypage-side-icon"><IconCard /></span>
            <span>구독</span>
            {activeSubs.length ? <em>{activeSubs.length}</em> : null}
          </a>
          <a href="#mypage-posts" className="mypage-side-item">
            <span className="mypage-side-icon"><IconPost /></span>
            <span>내 글</span>
            {posts.length ? <em>{posts.length}</em> : null}
          </a>
          <a href="#mypage-comments" className="mypage-side-item">
            <span className="mypage-side-icon"><IconChat /></span>
            <span>댓글</span>
            {commentsOnMyPosts.length ? <em>{commentsOnMyPosts.length}</em> : null}
          </a>
          <a href="#mypage-contact" className="mypage-side-item">
            <span className="mypage-side-icon"><IconMail /></span>
            <span>문의</span>
          </a>
        </nav>

        <div className="mypage-main">
      <MyPageAccountPanel
        initialNickname={safeProfile.display_name || name || ''}
        email={safeProfile.email || user.email || ''}
        username={safeProfile.username || ''}
        firstName={safeProfile.first_name || ''}
        lastName={safeProfile.last_name || ''}
      />

      <section id="mypage-favorites" className="mypage-section card" aria-labelledby="mypage-favorites-title">
        <div className="mypage-section-head">
          <h2 id="mypage-favorites-title" className="mypage-section-title">
            <span className="mypage-section-icon" aria-hidden="true"><IconHeart /></span>
            찜한 상품
          </h2>
          <span className="mypage-count">{favoriteProducts.length}</span>
        </div>
        {favoriteProducts.length ? (
          <div className="mypage-fav-strip">
            {favoriteProducts.slice(0, 12).map((item) => {
              const thumb = favoriteThumb(item);
              return (
                <Link key={item.id} href={`/shop/${item.id}`} className="mypage-fav-card">
                  <span
                    className="mypage-fav-thumb"
                    style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                  />
                  <span className="mypage-fav-meta">
                    <strong>{item.title || '상품'}</strong>
                    <em>{formatPriceCents(item.price_cents)}</em>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mypage-empty">
            <p>찜한 상품이 없습니다.</p>
            <Link href="/shop" className="btn btn-outline">튤립가게</Link>
          </div>
        )}
      </section>

      <section id="mypage-shop" className="mypage-section card" aria-labelledby="mypage-shop-title">
        <div className="mypage-section-head">
          <h2 id="mypage-shop-title" className="mypage-section-title">
            <span className="mypage-section-icon" aria-hidden="true"><IconStore /></span>
            내 가게
          </h2>
          <span className="mypage-count">
            {shopSponsor
              ? `${SELLER_STATUS_LABEL[shopSponsor.status] || shopSponsor.status}${
                  isIndividualSeller ? ' · 개인' : shopSponsor.seller_kind === 'business' ? ' · 사업자' : ''
                }`
              : showShopManage
                ? '구독 중'
                : '미등록'}
          </span>
        </div>
        {showShopManage ? (
          <div className="mypage-action-row">
            <Link href="/mypage/shop" className="mypage-action-chip">
              <IconStore />
              <span>가게 관리</span>
            </Link>
            <Link href="/shop" className="mypage-action-chip mypage-action-chip--ghost">
              <IconHeart />
              <span>공개 가게</span>
            </Link>
          </div>
        ) : (
          <>
            <p className="mypage-list-sub" style={{ marginBottom: 12 }}>
              개인·사업자 모두 상품을 올릴 수 있습니다. 직접 연락·외부 결제 링크로 거래하세요.
            </p>
            <div className="mypage-action-row">
              <Link href="/mypage/shop/apply" className="mypage-action-chip">
                <IconStore />
                <span>판매 시작</span>
              </Link>
              <Link href="/mypage/shop" className="mypage-action-chip mypage-action-chip--ghost">
                <IconPost />
                <span>가게 관리</span>
              </Link>
            </div>
          </>
        )}
      </section>

      {safeProfile.is_admin || safeProfile.is_moderator ? (
        <section className="mypage-section card" aria-labelledby="mypage-dir-title">
          <div className="mypage-section-head">
            <h2 id="mypage-dir-title" className="mypage-section-title">
              <span className="mypage-section-icon" aria-hidden="true"><IconAd /></span>
              지면 관리
            </h2>
          </div>
          <div className="mypage-action-row">
            <Link href="/directory" className="mypage-action-chip">디렉토리</Link>
            <Link href="/mypage/directory-pages" className="mypage-action-chip mypage-action-chip--ghost">배치</Link>
          </div>
        </section>
      ) : null}

      <section id="mypage-ads" className="mypage-section card" aria-labelledby="mypage-dir-ads-title">
        <div className="mypage-section-head">
          <h2 id="mypage-dir-ads-title" className="mypage-section-title">
            <span className="mypage-section-icon" aria-hidden="true"><IconAd /></span>
            내 광고
          </h2>
          <span className="mypage-count">{myDirectoryAds.length}</span>
        </div>
        {myDirectoryAds.length ? (
          <ul className="mypage-list">
            {myDirectoryAds.map((ad) => {
              const slot = ad.directory_slots;
              const pageLabel =
                slot?.page_number != null
                  ? `${slot.page_number}면 ${slot.position_label || ''}`.trim()
                  : '슬롯';
              return (
                <li key={ad.id} className="mypage-list-row">
                  <div>
                    <strong>{ad.ad_title || pageLabel}</strong>
                    <p className="mypage-list-sub">
                      {pageLabel}
                      {ad.period_end ? ` · ${formatJoinedDate(ad.period_end)}` : ''}
                    </p>
                  </div>
                  <div className="mypage-row-actions">
                    <span className={`mypage-status mypage-status--${ad.status || 'expired'}`}>
                      {STATUS_LABELS[ad.status] || ad.status}
                    </span>
                    {ad.status === 'active' ? (
                      <Link
                        href={`/directory/pages/edit?ad=${ad.id}`}
                        className="mypage-icon-btn"
                        title="수정"
                        aria-label="수정"
                      >
                        <IconPencil />
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mypage-empty">
            <p>신청한 지면 광고가 없습니다.</p>
            <Link href="/directory" className="btn btn-outline">업체 디렉토리</Link>
          </div>
        )}
      </section>

      <section id="mypage-subs" className="mypage-section card" aria-labelledby="mypage-subs-title">
        <div className="mypage-section-head">
          <h2 id="mypage-subs-title" className="mypage-section-title">
            <span className="mypage-section-icon" aria-hidden="true"><IconCard /></span>
            구독
          </h2>
          <span className="mypage-count">{activeSubs.length}</span>
        </div>
        {subscriptions.length ? (
          <ul className="mypage-list">
            {subscriptions.map((sub) => (
              <li key={sub.id} className="mypage-list-row">
                <div>
                  <strong>{PRODUCT_LABELS[sub.product_type] || sub.product_type}</strong>
                  <p className="mypage-list-sub">
                    {STATUS_LABELS[sub.status] || sub.status}
                    {sub.period_end ? ` · ${formatJoinedDate(sub.period_end)}` : ''}
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
          </div>
        )}
      </section>

      <section id="mypage-posts" className="mypage-section card" aria-labelledby="mypage-posts-title">
        <div className="mypage-section-head">
          <h2 id="mypage-posts-title" className="mypage-section-title">
            <span className="mypage-section-icon" aria-hidden="true"><IconPost /></span>
            내가 쓴 글
          </h2>
          <span className="mypage-count">{posts.length}</span>
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
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mypage-empty">
            <p>작성한 글이 없습니다.</p>
            <Link href="/board/free/new" className="btn btn-outline">글쓰기</Link>
          </div>
        )}
      </section>

      <section id="mypage-comments" className="mypage-section card" aria-labelledby="mypage-comments-title">
        <div className="mypage-section-head">
          <h2 id="mypage-comments-title" className="mypage-section-title">
            <span className="mypage-section-icon" aria-hidden="true"><IconChat /></span>
            내 글 댓글
          </h2>
          <span className="mypage-count">{commentsOnMyPosts.length}</span>
        </div>
        {commentsOnMyPosts.length ? (
          <ul className="mypage-list">
            {commentsOnMyPosts.map((c) => (
              <li key={c.id} className="mypage-list-row mypage-list-row--stack">
                <p className="mypage-comment-body">{excerpt(c.body, 100)}</p>
                <p className="mypage-list-sub">
                  {authorNameById[c.author_id] || '회원'} · {formatDateTime(c.created_at)} ·{' '}
                  <Link href={`/post/${c.post_id}`}>{postTitleById[c.post_id] || '원글'}</Link>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mypage-empty">
            <p>아직 댓글이 없습니다.</p>
          </div>
        )}
      </section>

      <MyPageAdminContact />
        </div>
      </div>
    </div>
  );
}
