/** Built-in QA sample for housing board (shown until a real DB post exists). */
export const SAMPLE_HOUSING_POST_ID = 'sample-housing';

export const SAMPLE_HOUSING_POST = {
  id: SAMPLE_HOUSING_POST_ID,
  title: '[예시] Holland 타운홈 2베드 렌트 — $1,450/월',
  body: `점검용 예시 매물입니다. (실제 매물이 아닙니다)

위치
- Holland 시내 인근, 조용한 주거 단지
- 학교·마트 차로 5~10분

포함
- 세탁기·건조기
- 주차 2대
- 중앙 에어컨

조건
- 월세 $1,450 / 디파짓 $1,450
- 소형 반려동물 가능 (펫 디파짓 별도)
- 입주: 즉시 협의

문의는 아래 연락처로 부탁드려요.`,
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
  author_id: null,
};

export function isSampleHousingPostId(id) {
  return String(id || '') === SAMPLE_HOUSING_POST_ID;
}

export function getSampleHousingPost() {
  return { ...SAMPLE_HOUSING_POST };
}
