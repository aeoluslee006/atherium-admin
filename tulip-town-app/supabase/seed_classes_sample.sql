-- Optional: insert a classes sample row (skip if you prefer the JS sample only).
-- Requires classes_board_schema.sql (contact_text, address_text).

insert into public.posts (
  title,
  body,
  city,
  category_slug,
  address_text,
  contact_text,
  is_pinned
)
select
  '[예시] SAT Math / 고등 수학 과외 (Holland · Online)',
  E'안녕하세요. (점검용 예시 글 · 실제 모집 아님)\n\nWest Michigan 지역 고등 수학 · SAT Math 과외합니다.\n\n■ 가능 과목\n- Middle / High School Math (Algebra, Geometry, Precalc, Calculus)\n- SAT Math\n- 개념 정리 + 문제 풀이 + 시험 대비\n\n■ 수업 방식\n- 1:1 또는 소그룹\n- 대면 또는 Online 가능\n- 학생 수준에 맞춰 커리큘럼 조정\n\n관심 있으신 분은 연락처로 문자 주세요.',
  'Holland',
  'classes',
  'Holland / Online',
  '문자 616-555-0190 (예시)',
  false
where not exists (
  select 1 from public.posts
  where category_slug = 'classes'
    and title like '%SAT Math%'
  limit 1
);
