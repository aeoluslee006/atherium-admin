import Link from 'next/link';
import GiftProductCard from '../../components/GiftProductCard';
import GiftShopNav from '../../components/GiftShopNav';
import {
  GIFT_CATEGORIES,
  GIFT_SHOP,
  getBestProducts,
  getDealProducts,
  getProductsByCategory,
} from '../../lib/giftShop';

export const metadata = {
  title: `${GIFT_SHOP.nameKo} · Tulip Town`,
  description: GIFT_SHOP.tagline,
};

export default function GiftHomePage({ searchParams }) {
  const cat = searchParams?.cat || 'all';
  const tab = searchParams?.tab || '';
  const deals = getDealProducts();
  const best = getBestProducts(4);
  const grid = getProductsByCategory(cat);
  const showDealsFocus = tab === 'deals';

  return (
    <div className="gift-page">
      <section className="gift-hero" aria-label={GIFT_SHOP.nameKo}>
        <div className="gift-hero-media" aria-hidden="true" />
        <div className="gift-hero-scrim" aria-hidden="true" />
        <div className="container gift-hero-copy">
          <p className="gift-hero-kicker">Tulip Town Gift</p>
          <h1 className="gift-hero-brand">{GIFT_SHOP.nameKo}</h1>
          <p className="gift-hero-lead">{GIFT_SHOP.tagline}</p>
          <div className="gift-hero-cta">
            <a href="#gift-deals" className="btn">
              특가 보기
            </a>
            <Link href="/gift/best" className="btn btn-outline gift-hero-secondary">
              인기 BEST
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        <GiftShopNav />

        <section id="gift-deals" className="gift-section">
          <div className="gift-section-head">
            <h2 className="gift-section-title">
              {showDealsFocus ? '지금 특가' : '지금 가장 많이 담는 특가'}
            </h2>
            <p className="gift-section-desc">부담 없이 건네기 좋은 가격대만 모았어요.</p>
          </div>
          <div className="gift-rail">
            {deals.map((product) => (
              <GiftProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="gift-section">
          <div className="gift-section-head gift-section-head-row">
            <div>
              <h2 className="gift-section-title">실시간 인기</h2>
              <p className="gift-section-desc">남들은 뭘 선물했을까?</p>
            </div>
            <Link href="/gift/best" className="gift-section-more">
              BEST 전체
            </Link>
          </div>
          <div className="gift-grid gift-grid-4">
            {best.map((product, i) => (
              <GiftProductCard key={product.id} product={product} rank={i + 1} />
            ))}
          </div>
        </section>

        <section className="gift-section">
          <div className="gift-section-head">
            <h2 className="gift-section-title">전체 상품</h2>
            <p className="gift-section-desc">카테고리로 골라보세요.</p>
          </div>
          <div className="gift-cats" role="list">
            {GIFT_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={c.slug === 'all' ? '/gift' : `/gift?cat=${c.slug}`}
                role="listitem"
                className={`gift-cat-chip${cat === c.slug ? ' is-active' : ''}`}
              >
                {c.nameKo}
              </Link>
            ))}
          </div>
          <div className="gift-grid">
            {grid.map((product) => (
              <GiftProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="gift-note">
          <strong>{GIFT_SHOP.nameKo}</strong>는 Tulip Town 이웃을 위한 선물·특가 공간입니다. 결제 연결은
          곧 열리고, 지금은 상품을 둘러보며 관심 상품을 확인해 주세요.
        </section>
      </div>
    </div>
  );
}
