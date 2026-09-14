import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoTranslatedText from '../../../../components/AutoTranslatedText';
import MemberTierBadge from '../../../../components/MemberTierBadge';
import ShopCatalog from '../../../../components/ShopCatalog';
import ShopContactChannels from '../../../../components/ShopContactChannels';
import { createServerT, getServerLocale } from '../../../../lib/i18n/server';
import { getTierMeta } from '../../../../lib/memberTier';
import { loadFavoriteProductIds } from '../../../../lib/shopFavorites';
import { loadSellerReviewCount } from '../../../../lib/shopReviews';
import { loadSellerTrust } from '../../../../lib/shopSellerTrust';
import { supabaseRest } from '../../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

async function loadSeller(id) {
  const selects = [
    `sponsors?select=id,business_name,city,description,status,listing_type,contact,contact_channels,submitted_by&id=eq.${encodeURIComponent(id)}&listing_type=eq.shop&status=eq.approved&limit=1`,
    `sponsors?select=id,business_name,city,description,status,listing_type,contact,submitted_by&id=eq.${encodeURIComponent(id)}&listing_type=eq.shop&status=eq.approved&limit=1`,
    `sponsors?select=id,business_name,city,description,status,listing_type,submitted_by&id=eq.${encodeURIComponent(id)}&listing_type=eq.shop&status=eq.approved&limit=1`,
    `sponsors?select=id,business_name,city,description,status,listing_type&id=eq.${encodeURIComponent(id)}&listing_type=eq.shop&status=eq.approved&limit=1`,
  ];

  for (const path of selects) {
    try {
      const rows = await supabaseRest(path);
      const seller = Array.isArray(rows) ? rows[0] : null;
      if (seller) return seller;
    } catch {
      // try next select shape
    }
  }
  return null;
}

async function loadSellerProducts(sponsorId, seller) {
  const selects = [
    `products?select=id,title,description,price_cents,image_url,image_urls,category,shipping_scope,created_at,sponsor_id&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`,
    `products?select=id,title,description,price_cents,image_url,category,shipping_scope,created_at,sponsor_id&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`,
    `products?select=id,title,description,price_cents,image_url,category,created_at,sponsor_id&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`,
    `products?select=id,title,price_cents,image_url,created_at,sponsor_id&sponsor_id=eq.${encodeURIComponent(sponsorId)}&is_active=eq.true&order=created_at.desc`,
  ];

  for (const path of selects) {
    try {
      const rows = await supabaseRest(path);
      if (!Array.isArray(rows)) continue;
      return rows.map((item) => ({
        ...item,
        sponsor: {
          id: seller.id,
          business_name: seller.business_name,
          city: seller.city,
          status: seller.status,
          listing_type: seller.listing_type,
        },
      }));
    } catch {
      // try next select shape
    }
  }
  return [];
}

export async function generateMetadata({ params }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const seller = await loadSeller(params.id);
  if (!seller) return { title: t('shop.sellerTitle') };
  return {
    title: `${seller.business_name} · ${t('shop.home')}`,
    description: seller.description || t('shop.sellerProducts', { name: seller.business_name }),
  };
}

export default async function ShopSellerPage({ params }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const seller = await loadSeller(params.id);
  if (!seller) notFound();

  const [products, sellerTrust, favoriteIds, reviewCount] = await Promise.all([
    loadSellerProducts(seller.id, seller),
    loadSellerTrust(seller, locale),
    loadFavoriteProductIds(),
    loadSellerReviewCount(seller.id),
  ]);
  const tierMeta = getTierMeta(sellerTrust.tier);
  const tierLabel = t(`tier.${sellerTrust.tier}`) !== `tier.${sellerTrust.tier}`
    ? t(`tier.${sellerTrust.tier}`)
    : (locale === 'en' ? tierMeta.labelEn : tierMeta.labelKo);

  return (
    <div className="shop-page">
      <div className="container" style={{ paddingTop: 28, paddingBottom: 8 }}>
        <Link href="/shop" className="btn btn-outline">
          {t('shop.home')}
        </Link>

        <header className="shop-seller-profile">
          <h1 className="shop-seller-profile-name">
            <AutoTranslatedText text={seller.business_name} />
          </h1>
          <div className="shop-seller-profile-meta">
            {seller.city ? <span>{seller.city}</span> : null}
            {seller.city ? <span aria-hidden="true"> · </span> : null}
            <span>{t('shop.sellerMeta', { count: products.length })}</span>
            <span aria-hidden="true"> · </span>
            <span>{t('shop.sellerLikes', { count: reviewCount })}</span>
          </div>

          <div className="shop-seller-trust" aria-label={t('shop.sellerTierLabel')}>
            <MemberTierBadge tier={sellerTrust.tier} />
            <span className="shop-seller-trust-text">
              {t('shop.sellerTierText', { tier: tierLabel })}
              {sellerTrust.tenureLabel ? ` · ${sellerTrust.tenureLabel}` : ''}
            </span>
          </div>

          {seller.description ? (
            <p className="shop-seller-profile-bio">
              <AutoTranslatedText text={seller.description} />
            </p>
          ) : null}

          <ShopContactChannels
            contact={seller.contact}
            contactChannels={seller.contact_channels}
            showHeading
          />
        </header>
      </div>

      <div className="container" id="shop-grid">
        <ShopCatalog
          items={products}
          sectionTitle={t('shop.sellerProducts', { name: seller.business_name })}
          showSellerLink={false}
          favoriteIds={favoriteIds}
        />
      </div>
    </div>
  );
}
