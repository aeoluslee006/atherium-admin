/** Built-in QA sample for classes board (shown until a real DB post exists). */
export const SAMPLE_CLASSES_POST_ID = 'sample-classes';

export const SAMPLE_CLASSES_POST = {
  id: SAMPLE_CLASSES_POST_ID,
  title: '[예시] SAT Math / 고등 수학 과외 (Holland · Online)',
  body: `안녕하세요. (점검용 예시 글 · 실제 모집 아님)

West Michigan 지역 고등 수학 · SAT Math 과외합니다.

■ 가능 과목
- Middle / High School Math (Algebra, Geometry, Precalc, Calculus)
- SAT Math
- 개념 정리 + 문제 풀이 + 시험 대비

■ 수업 방식
- 1:1 또는 소그룹
- 대면 또는 Online 가능
- 학생 수준에 맞춰 커리큘럼 조정

관심 있으신 분은 연락처로 문자 주세요.`,
  city: 'Holland',
  category_slug: 'classes',
  subcategory: null,
  is_pinned: false,
  created_at: '2026-08-06T20:38:00.000Z',
  view_count: 9,
  address_text: 'Holland / Online',
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
