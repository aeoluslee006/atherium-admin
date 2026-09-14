import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoTranslatedText from '../../../components/AutoTranslatedText';
import MemberTierBadge from '../../../components/MemberTierBadge';
import ProductFavoriteButton from '../../../components/ProductFavoriteButton';
import ProductReviewSection from '../../../components/ProductReviewSection';
import ShopContactChannels from '../../../components/ShopContactChannels';
import ShopDetailGallery from '../../../components/ShopDetailGallery';
import ShopPaymentLinkButton from '../../../components/ShopPaymentLinkButton';
import { createServerT, getServerLocale } from '../../../lib/i18n/server';
import { getTierMeta } from '../../../lib/memberTier';
import {
  contactChannelsHaveAny,
  primaryContactHref,
} from '../../../lib/sellerContact';
import { formatPriceCents } from '../../../lib/sellerConstants';
import { productImageList } from '../../../lib/shopCatalog';
import { loadFavoriteProductIds } from '../../../lib/shopFavorites';
import {
  loadMyProductReview,
  loadProductReviews,
} from '../../../lib/shopReviews';
import { loadSellerTrust } from '../../../lib/shopSellerTrust';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

function placeholderImage(seed) {
  return `https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80&sig=${encodeURIComponent(seed || 'shop')}`;
}

async function loadProduct(id) {
  const selects = [
    `products?select=id,title,description,price_cents,image_url,image_urls,category,shipping_scope,payment_link,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,contact_channels,description,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,image_urls,category,shipping_scope,payment_link,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,image_urls,category,shipping_scope,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,image_urls,category,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,category,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,description,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,contact,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
    `products?select=id,title,description,price_cents,image_url,created_at,is_active,sponsor_id,sponsors(id,business_name,city,status,listing_type,submitted_by)&id=eq.${encodeURIComponent(id)}&limit=1`,
  ];

  for (const path of selects) {
    try {
      const rows = await supabaseRest(path);
      const item = Array.isArray(rows) ? rows[0] : null;
      if (!item) continue;
      const seller = item.sponsors;
      if (!seller || seller.status !== 'approved' || seller.listing_type !== 'shop') return null;
      return { ...item, seller };
    } catch {
      // try next select shape
    }
  }
  return null;
}

export async function generateMetadata({ params }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const item = await loadProduct(params.id);
  if (!item) return { title: t('shop.home') };
  return {
    title: `${item.title} · ${t('shop.home')}`,
    description: item.description || t('shop.productFallback'),
  };
}

export default async function ShopDetailPage({ params }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const item = await loadProduct(params.id);
  if (!item) notFound();

  const [favoriteIds, reviews, myReview] = await Promise.all([
    loadFavoriteProductIds(),
    loadProductReviews(item.id),
    loadMyProductReview(item.id),
  ]);
  const isFavorited = favoriteIds.includes(item.id);
  const isSold = item.is_active === false;

  const images = productImageList(item);
  const gallery = images.length ? images : [placeholderImage(item.id)];
  const sellerTrust = await loadSellerTrust(item.seller);
  const tierMeta = getTierMeta(sellerTrust.tier);
  const tierLabel = t(`tier.${sellerTrust.tier}`) !== `tier.${sellerTrust.tier}`
    ? t(`tier.${sellerTrust.tier}`)
    : tierMeta.labelKo;
  const categoryLabel = item.category
    ? (t(`shop.cat.${item.category}`) !== `shop.cat.${item.category}`
      ? t(`shop.cat.${item.category}`)
      : item.category)
    : '';
  const hasContact =
    Boolean(String(item.seller.contact || '').trim()) ||
    contactChannelsHaveAny(item.seller.contact_channels);

  return (
    <div className="container shop-detail">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <Link href="/shop" className="btn btn-outline">
          {t('shop.backToList')}
        </Link>
        <ProductFavoriteButton
          productId={item.id}
          initialFavorited={isFavorited}
          size="lg"
          className="shop-fav-btn--detail"
        />
      </div>

      <div className="shop-detail-grid">
        <div className="shop-detail-media-wrap">
          <ShopDetailGallery images={gallery} title={item.title} />
          {isSold ? (
            <span className="shop-card-sold-badge shop-card-sold-badge--detail">
              {t('shop.sold')}
            </span>
          ) : null}
        </div>
        <div>
          <div className="shop-detail-price">{formatPriceCents(item.price_cents)}</div>
          <h1 className="shop-detail-title">
            <AutoTranslatedText text={item.title} />
          </h1>
          <div className="shop-detail-meta">
            {t('shop.sellerPrefix')}{' '}
            <Link href={`/shop/seller/${item.seller.id}`} className="shop-seller-link">
              <AutoTranslatedText text={item.seller.business_name} />
            </Link>
            {item.seller.city ? ` · ${item.seller.city}` : ''}
            {categoryLabel ? ` · ${categoryLabel}` : ''}
          </div>

          <div className="shop-seller-trust" aria-label={t('shop.sellerTierAria')}>
            <MemberTierBadge tier={sellerTrust.tier} />
            <span className="shop-seller-trust-text">
              {t('shop.sellerTier', { tier: tierLabel })}
              {sellerTrust.tenureLabel ? ` · ${sellerTrust.tenureLabel}` : ''}
            </span>
          </div>

          <p className="shop-detail-desc">
            {item.description ? (
              <AutoTranslatedText text={item.description} />
            ) : (
              t('shop.noDescription')
            )}
          </p>

          <div className="shop-contact-box">
            <div className="shop-contact-label">{t('shop.contactDirect')}</div>
            {isSold ? (
              <p className="hint-text" style={{ marginTop: 8 }}>
                {t('shop.soldDone')}
              </p>
            ) : hasContact ? (
              <ShopContactChannels
                contact={item.seller.contact}
                contactChannels={item.seller.contact_channels}
              />
            ) : (
              <p id="shop-seller-contact" className="hint-text" style={{ marginTop: 8 }}>
                {t('shop.contactOnStore')}
              </p>
            )}

            {!isSold ? (
              <div className="shop-contact-actions">
                <a
                  href={primaryContactHref({
                    contact: item.seller.contact,
                    channels: item.seller.contact_channels,
                  })}
                  className="btn shop-contact-cta"
                >
                  {t('shop.contactSeller')}
                </a>
                <ShopPaymentLinkButton paymentLink={item.payment_link || null} />
              </div>
            ) : null}

            <p className="shop-safety-note">{t('shop.safetyNote')}</p>

            <Link
              href={`/shop/seller/${item.seller.id}`}
              className="btn btn-outline"
              style={{ marginTop: 12, display: 'inline-flex' }}
            >
              {t('shop.moreFromSeller', { name: item.seller.business_name })}
            </Link>
            <p className="hint-text" style={{ marginTop: 8 }}>
              {t('shop.noAppPayment')}
            </p>
          </div>
        </div>
      </div>

      <ProductReviewSection
        productId={item.id}
        isSold={isSold}
        initialReviews={reviews}
        initialMyReview={myReview}
        sellerUserId={item.seller?.submitted_by || null}
      />
    </div>
  );
}
