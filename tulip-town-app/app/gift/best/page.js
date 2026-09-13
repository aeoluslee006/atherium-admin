import Link from 'next/link';
import GiftProductCard from '../../../components/GiftProductCard';
import GiftShopNav from '../../../components/GiftShopNav';
import { GIFT_SHOP, getBestProducts } from '../../../lib/giftShop';

export const metadata = {
  title: `인기 BEST · ${GIFT_SHOP.nameKo}`,
  description: '남들은 뭘 선물했을까? 카테고리별 인기 상품',
};

export default function GiftBestPage() {
  const best = getBestProducts(12);

  return (
    <div className="gift-page">
      <section className="gift-best-hero">
        <div className="container">
          <p className="gift-hero-kicker">{GIFT_SHOP.nameKo}</p>
          <h1 className="gift-best-title">BEST 12</h1>
          <p className="gift-best-lead">남들은 뭘 선물했을까? 지금 반응이 좋은 상품만 모았어요.</p>
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
            {GIFT_SHOP.nameKo} 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
