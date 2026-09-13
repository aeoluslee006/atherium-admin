import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
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

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY';

async function fetchMarketplaceProducts(cat) {
  try {
    const db = createClient(supabaseUrl, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = db
      .from('gift_products')
      .select(
        'id, name_ko, name_en, category, blurb, price_cents, compare_at_cents, image_url, badge, is_gift, is_online_only, seller_id, gift_sellers(shop_name, city, charges_enabled)'
      )
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(60);
    if (cat && cat !== 'all') q = q.eq('category', cat);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map((p) => ({
      id: p.id,
      nameKo: p.name_ko,
      nameEn: p.name_en,
      category: p.category,
      vendor: p.gift_sellers?.shop_name || '입점 판매자',
      priceUsd: (p.price_cents || 0) / 100,
      compareAtUsd: p.compare_at_cents ? p.compare_at_cents / 100 : null,
      blurb: p.blurb,
      image:
        p.image_url ||
        'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80',
      badge: p.badge,
      giftOnly: p.is_gift,
      onlineOnly: p.is_online_only,
      source: 'marketplace',
      chargesEnabled: !!p.gift_sellers?.charges_enabled,
    }));
  } catch {
    return [];
  }
}

export default async function GiftHomePage({ searchParams }) {
  const cat = searchParams?.cat || 'all';
  const tab = searchParams?.tab || '';
  const deals = getDealProducts();
  const best = getBestProducts(4);
  const curated = getProductsByCategory(cat);
  const marketplace = await fetchMarketplaceProducts(cat);
  const grid = [...marketplace, ...curated];
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
            <Link href="/seller/apply" className="btn btn-outline gift-hero-secondary">
              판매 시작
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        <GiftShopNav />

        {marketplace.length ? (
          <section className="gift-section">
            <div className="gift-section-head gift-section-head-row">
              <div>
                <h2 className="gift-section-title">입점 판매자 상품</h2>
                <p className="gift-section-desc">이웃 판매자가 올린 상품이에요.</p>
              </div>
              <Link href="/seller/apply" className="gift-section-more">
                나도 판매하기
              </Link>
            </div>
            <div className="gift-grid">
              {marketplace.map((product) => (
                <GiftProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

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
              <GiftProductCard key={`${product.source || 'curated'}-${product.id}`} product={product} />
            ))}
          </div>
        </section>

        <section className="gift-note">
          <strong>{GIFT_SHOP.nameKo}</strong>는 이웃 판매자 입점 마켓입니다. 판매 수수료 2% · 판매자 월
          구독 $15 (상품 30개). <Link href="/seller/apply">판매자 신청</Link>
        </section>
      </div>
    </div>
  );
}
