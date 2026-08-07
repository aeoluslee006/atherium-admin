-- Optional: insert a clubs sample row (skip if you prefer the JS sample only).
-- Requires clubs_board_schema.sql (contact_text, address_text).

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
  '[예시] Holland 주말 등산 모임',
  E'웨스트미시간 한인 등산 동호회입니다.\n\n매주 토요일 아침 모여서 근교 트레일을 걷습니다.\n초보·가족 환영 · 날씨 나쁘면 카페 번개로 대체합니다.\n\n관심 있으신 분은 연락처로 문자 주세요.',
  'Holland',
  'clubs',
  'Holland State Park — 주차장 입구',
  '문자 616-555-0142 (예시)',
  false
where not exists (
  select 1 from public.posts
  where category_slug = 'clubs'
    and title like '%Holland 주말 등산%'
  limit 1
);
