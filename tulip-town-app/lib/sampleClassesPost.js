/** Built-in QA sample for classes board (shown until a real DB post exists). */
export const SAMPLE_CLASSES_POST_ID = 'sample-classes';

export const SAMPLE_CLASSES_POST = {
  id: SAMPLE_CLASSES_POST_ID,
  title: '[예시] Holland 한국어 회화 수업',
  body: `초급·중급 한국어 회화 수업입니다. (예시 글 · 실제 모집 아님)

주 1회 · 소그룹 · 회화 위주
교재는 첫 수업 때 안내합니다.

관심 있으신 분은 연락처로 문자 주세요.`,
  city: 'Holland',
  category_slug: 'classes',
  subcategory: null,
  is_pinned: false,
  created_at: '2026-08-06T10:00:00.000Z',
  view_count: 12,
  address_text: 'Holland Public Library 스터디룸',
  contact_text: '문자 616-555-0190 (예시)',
  author_id: null,
};

export function isSampleClassesPostId(id) {
  const value = String(id || '');
  return value === SAMPLE_CLASSES_POST_ID || value === 'sample-clubs';
}

export function getSampleClassesPost() {
  return { ...SAMPLE_CLASSES_POST };
}
