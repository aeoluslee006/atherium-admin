/** Built-in QA sample for clubs board (shown until a real DB post exists). */
export const SAMPLE_CLUBS_POST_ID = 'sample-clubs';

export const SAMPLE_CLUBS_POST = {
  id: SAMPLE_CLUBS_POST_ID,
  title: '[예시] Holland 주말 등산 모임',
  body: `웨스트미시간 한인 등산 동호회입니다.

매주 토요일 아침 모여서 근교 트레일을 걷습니다.
초보·가족 환영 · 날씨 나쁘면 카페 번개로 대체합니다.

관심 있으신 분은 연락처로 문자 주세요.`,
  city: 'Holland',
  category_slug: 'clubs',
  subcategory: null,
  is_pinned: false,
  created_at: '2026-08-06T10:00:00.000Z',
  view_count: 12,
  address_text: 'Holland State Park — 주차장 입구',
  contact_text: '문자 616-555-0142 (예시)',
  author_id: null,
};

export function isSampleClubsPostId(id) {
  return String(id || '') === SAMPLE_CLUBS_POST_ID;
}

export function getSampleClubsPost() {
  return { ...SAMPLE_CLUBS_POST };
}
