import Link from 'next/link';
import GiftProductCard from '../../../components/GiftProductCard';
import GiftShopNav from '../../../components/GiftShopNav';
import { createServerT, getServerLocale } from '../../../lib/i18n/server';
import { GIFT_SHOP, getBestProducts } from '../../../lib/giftShop';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const shopName = locale === 'en' ? GIFT_SHOP.nameEn : GIFT_SHOP.nameKo;
  return {
    title: `${t('gift.bestTitle')} · ${shopName}`,
    description: t('gift.bestDesc'),
  };
}

export default async function GiftBestPage() {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const shopName = locale === 'en' ? GIFT_SHOP.nameEn : GIFT_SHOP.nameKo;
  const best = getBestProducts(12);

  return (
    <div className="gift-page">
      <section className="gift-best-hero">
        <div className="container">
          <p className="gift-hero-kicker">{shopName}</p>
          <h1 className="gift-best-title">BEST 12</h1>
          <p className="gift-best-lead">{t('gift.bestLead')}</p>
        </div>
      </section>

      <div className="container">
        <GiftShopNav />
        <div className="gift-grid">
          {best.map((product, i) => (
            <GiftProductCard key={product.id} product={product} rank={i + 1} />
          ))}
        </div>
        <div className="gift-best-foot">
          <Link href="/gift" className="btn btn-outline">
            {t('gift.backHome', { name: shopName })}
          </Link>
        </div>
      </div>
    </div>
  );
}
