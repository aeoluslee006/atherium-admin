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
  '[예시] Holland 한국어 회화 수업',
  E'초급·중급 한국어 회화 수업입니다. (예시 글 · 실제 모집 아님)\n\n주 1회 · 소그룹 · 회화 위주\n교재는 첫 수업 때 안내합니다.\n\n관심 있으신 분은 연락처로 문자 주세요.',
  'Holland',
  'classes',
  'Holland Public Library 스터디룸',
  '문자 616-555-0190 (예시)',
  false
where not exists (
  select 1 from public.posts
  where category_slug = 'classes'
    and title like '%한국어 회화%'
  limit 1
);
