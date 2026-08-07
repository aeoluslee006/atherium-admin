/** Built-in QA sample: 동호회 posts live on the free board. */
export const SAMPLE_FREE_CLUB_POST_ID = 'sample-free-club';

export const SAMPLE_FREE_CLUB_POST = {
  id: SAMPLE_FREE_CLUB_POST_ID,
  title: '[예시] Holland 주말 등산 모임',
  body: `웨스트미시간 한인 등산 동호회입니다.

매주 토요일 아침 모여서 근교 트레일을 걷습니다.
초보·가족 환영 · 날씨 나쁘면 카페 번개로 대체합니다.

관심 있으신 분은 댓글 남겨 주세요.`,
  city: 'Holland',
  category_slug: 'free',
  subcategory: 'club',
  is_pinned: false,
  is_featured: false,
  created_at: '2026-08-06T10:00:00.000Z',
  view_count: 12,
  author_id: null,
};

export function isSampleFreeClubPostId(id) {
  return String(id || '') === SAMPLE_FREE_CLUB_POST_ID;
}

export function getSampleFreeClubPost() {
  return { ...SAMPLE_FREE_CLUB_POST };
}
