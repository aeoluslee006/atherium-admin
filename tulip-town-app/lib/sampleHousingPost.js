/** Built-in QA sample for housing board (shown until a real DB post exists). */
export const SAMPLE_HOUSING_POST_ID = 'sample-housing';

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
];

export const SAMPLE_HOUSING_POST = {
  id: SAMPLE_HOUSING_POST_ID,
  title: '[예시] Holland 타운홈 2베드 렌트 — $1,450/월',
  body: `<p>점검용 예시 매물입니다. (실제 매물이 아닙니다)</p>
<p><strong>위치</strong><br/>Holland 시내 인근, 조용한 주거 단지 · 학교·마트 차로 5~10분</p>
<p><strong>포함</strong><br/>세탁기·건조기 · 주차 2대 · 중앙 에어컨</p>
<p><strong>조건</strong><br/>월세 $1,450 / 디파짓 $1,450 · 소형 반려동물 가능(펫 디파짓 별도) · 즉시 입주 협의</p>`,
  city: 'Holland',
  category_slug: 'housing',
  subcategory: 'rent',
  is_pinned: false,
  created_at: '2026-08-05T15:00:00.000Z',
  view_count: 12,
  rent_price_text: '$1,450 /월',
  deposit_text: '$1,450',
  housing_type: 'condo',
  beds: '2',
  baths: '1.5',
  address_text: 'Holland, MI (시내 인근)',
  available_text: '즉시 입주 가능',
  contact_text: '문자 616-555-0142 (예시)',
  image_urls: JSON.stringify(SAMPLE_PHOTOS),
  author_id: null,
};

export function isSampleHousingPostId(id) {
  return String(id || '') === SAMPLE_HOUSING_POST_ID;
}

export function getSampleHousingPost() {
  return { ...SAMPLE_HOUSING_POST };
}
