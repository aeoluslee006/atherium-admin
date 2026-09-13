/** 튤립가게 — Tulip Town gift mall catalog (static seed for v1) */

export const GIFT_SHOP = {
  nameKo: '튤립가게',
  nameEn: 'Tulip Gift',
  tagline: '동네 사람끼리, 예쁜 마음 한 송이',
  href: '/gift',
};

export const GIFT_CATEGORIES = [
  { slug: 'all', nameKo: '전체' },
  { slug: 'local', nameKo: '동네맛·카페' },
  { slug: 'care', nameKo: '생활·케어' },
  { slug: 'kids', nameKo: '아이·가족' },
  { slug: 'community', nameKo: '커뮤니티 특가' },
];

/**
 * @typedef {object} GiftProduct
 * @property {string} id
 * @property {string} nameKo
 * @property {string} [nameEn]
 * @property {string} category
 * @property {string} vendor
 * @property {number} priceUsd
 * @property {number} [compareAtUsd]
 * @property {string} blurb
 * @property {string} image
 * @property {string} [badge]
 * @property {boolean} [giftOnly]
 * @property {boolean} [onlineOnly]
 * @property {number} [rankScore]
 * @property {boolean} [featured]
 * @property {boolean} [deal]
 */

/** @type {GiftProduct[]} */
export const GIFT_PRODUCTS = [
  {
    id: 'holland-bakery-box',
    nameKo: '홀랜드 베이커리 선물세트',
    nameEn: 'Holland Bakery Box',
    category: 'local',
    vendor: '동네맛집',
    priceUsd: 28,
    compareAtUsd: 36,
    blurb: '갓 구운 빵·쿠키를 한 상자에. 이사 온 이웃이나 모임 답례로 딱이에요.',
    image:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    badge: '특가',
    giftOnly: true,
    featured: true,
    deal: true,
    rankScore: 98,
  },
  {
    id: 'korean-snack-crate',
    nameKo: '한인마트 간식박스',
    nameEn: 'K-Snack Crate',
    category: 'local',
    vendor: 'TTKC Picks',
    priceUsd: 32,
    blurb: '과자·음료·라면을 골라 담은 웰컴 박스. 새 가족 환영 선물로 인기예요.',
    image:
      'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=800&q=80',
    giftOnly: true,
    featured: true,
    deal: true,
    rankScore: 94,
  },
  {
    id: 'tulip-bouquet-local',
    nameKo: '미시간 튤립 한 다발',
    nameEn: 'Michigan Tulip Bouquet',
    category: 'care',
    vendor: 'Tulip Town',
    priceUsd: 24,
    compareAtUsd: 30,
    blurb: '시즌에 맞춰 꽂은 생화 다발. 생일·감사·응원에 가장 많이 골라요.',
    image:
      'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80',
    badge: 'BEST',
    giftOnly: true,
    featured: true,
    deal: true,
    rankScore: 99,
  },
  {
    id: 'coffee-gift-card',
    nameKo: '그랜드래피즈 카페 기프트카드',
    nameEn: 'GR Coffee Gift Card',
    category: 'local',
    vendor: '파트너 카페',
    priceUsd: 20,
    blurb: '동네 카페에서 바로 쓸 수 있는 $20 카드. 부담 없는 마음 표현.',
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    giftOnly: true,
    rankScore: 88,
  },
  {
    id: 'selfcare-set',
    nameKo: '주말 셀프케어 세트',
    nameEn: 'Weekend Care Set',
    category: 'care',
    vendor: '오뜨베 스타일',
    priceUsd: 39,
    compareAtUsd: 55,
    blurb: '크림·미스트·티를 한데 모은 휴식 세트. “수고했어요” 한마디에 곁들이기 좋아요.',
    image:
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
    badge: '46%',
    giftOnly: true,
    deal: true,
    rankScore: 91,
  },
  {
    id: 'kids-activity-kit',
    nameKo: '아이 주말 액티비티 키트',
    nameEn: 'Kids Weekend Kit',
    category: 'kids',
    vendor: '가족추천',
    priceUsd: 26,
    blurb: '색칠·스티커·간단 실험까지. 비 오는 주말 선물로 반응이 좋아요.',
    image:
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    giftOnly: true,
    rankScore: 82,
  },
  {
    id: 'family-picnic-set',
    nameKo: '가족 피크닉 세트',
    nameEn: 'Family Picnic Set',
    category: 'kids',
    vendor: 'TTKC Picks',
    priceUsd: 45,
    blurb: '매트·텀블러·간식 파우치. 홀랜드·윈드밀 공원 나들이용.',
    image:
      'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
    giftOnly: true,
    rankScore: 79,
  },
  {
    id: 'jobs-boost-7d',
    nameKo: '구인구직 상단 노출 7일',
    nameEn: 'Jobs Boost 7 days',
    category: 'community',
    vendor: 'Tulip Town',
    priceUsd: 15,
    blurb: '구인·구직 글이 리스트 상단에 7일간 고정됩니다. 온라인 전용.',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    badge: '온라인',
    onlineOnly: true,
    rankScore: 86,
  },
  {
    id: 'market-boost-7d',
    nameKo: '중고장터 상단 노출 7일',
    nameEn: 'Market Boost 7 days',
    category: 'community',
    vendor: 'Tulip Town',
    priceUsd: 12,
    blurb: '팔고 싶은 글이 더 빨리 보이게. 중고·나눔 글 전용 부스트.',
    image:
      'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=800&q=80',
    badge: '온라인',
    onlineOnly: true,
    rankScore: 84,
  },
  {
    id: 'home-banner-7d',
    nameKo: '홈 특별광고 7일',
    nameEn: 'Home Banner 7 days',
    category: 'community',
    vendor: 'Tulip Town',
    priceUsd: 29,
    compareAtUsd: 39,
    blurb: '메인 화면 특별광고 자리에 업체를 올려 드려요. 오픈·이벤트에 효과적.',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    badge: '특가',
    onlineOnly: true,
    deal: true,
    rankScore: 90,
  },
  {
    id: 'directory-coupon',
    nameKo: '업체 디렉토리 등록 할인',
    nameEn: 'Directory Listing Coupon',
    category: 'community',
    vendor: 'Tulip Town',
    priceUsd: 8,
    blurb: '업체 디렉토리 월 등록료에서 바로 차감되는 할인 쿠폰입니다.',
    image:
      'https://images.unsplash.com/photo-1556745753-b2904692e75f?auto=format&fit=crop&w=800&q=80',
    onlineOnly: true,
    rankScore: 77,
  },
  {
    id: 'thank-you-plant',
    nameKo: '감사 미니 화분',
    nameEn: 'Thank-you Mini Plant',
    category: 'care',
    vendor: '그린샵',
    priceUsd: 18,
    blurb: '책상 위에 두는 작은 화분. 선생님·동료·이웃 감사 인사에 잘 맞아요.',
    image:
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80',
    giftOnly: true,
    rankScore: 80,
  },
];

export function getGiftProduct(id) {
  return GIFT_PRODUCTS.find((p) => p.id === id) || null;
}

export function getDealProducts() {
  return GIFT_PRODUCTS.filter((p) => p.deal).sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
}

export function getBestProducts(limit = 8) {
  return [...GIFT_PRODUCTS].sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0)).slice(0, limit);
}

export function getProductsByCategory(category) {
  if (!category || category === 'all') return GIFT_PRODUCTS;
  return GIFT_PRODUCTS.filter((p) => p.category === category);
}

export function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function discountPercent(product) {
  if (!product.compareAtUsd || product.compareAtUsd <= product.priceUsd) return null;
  return Math.round((1 - product.priceUsd / product.compareAtUsd) * 100);
}
