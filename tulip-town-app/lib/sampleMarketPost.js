/** Built-in QA sample for market board (shown until a real DB post exists). */
export const SAMPLE_MARKET_POST_ID = 'sample-market';

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80',
];

export const SAMPLE_MARKET_POST = {
  id: SAMPLE_MARKET_POST_ID,
  title: '[예시] IKEA 소파 팝니다 — 상태 좋음',
  body: `<p>점검용 예시 글입니다. (실제 판매 아님)</p>
<p><strong>상품</strong><br/>IKEA 패브릭 소파 · 사용 1년 · 반려동물/흡연 없음</p>
<p><strong>거래</strong><br/>Holland 직거래 선호 · 문의사항은 문자 주세요</p>`,
  city: 'Holland',
  category_slug: 'market',
  subcategory: 'sell',
  is_pinned: false,
  created_at: '2026-08-06T16:00:00.000Z',
  view_count: 19,
  price_text: '$120',
  contact_text: '문자 616-555-0177 (예시)',
  image_urls: JSON.stringify(SAMPLE_PHOTOS),
  author_id: null,
};

export function isSampleMarketPostId(id) {
  return String(id || '') === SAMPLE_MARKET_POST_ID;
}

export function getSampleMarketPost() {
  return { ...SAMPLE_MARKET_POST };
}
