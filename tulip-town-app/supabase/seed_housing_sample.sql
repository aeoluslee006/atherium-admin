-- Housing board: schema columns + one QA sample listing
-- Run once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lyikgkjhkmppvciicxfm/sql/new

alter table public.posts
  add column if not exists subcategory text,
  add column if not exists view_count integer not null default 0,
  add column if not exists rent_price_text text,
  add column if not exists deposit_text text,
  add column if not exists housing_type text,
  add column if not exists beds text,
  add column if not exists baths text,
  add column if not exists address_text text,
  add column if not exists available_text text,
  add column if not exists contact_text text;

create index if not exists posts_housing_subcategory_idx
  on public.posts (category_slug, subcategory)
  where category_slug = 'housing';

-- One sample row for QA (skip if already present)
insert into public.posts (
  title,
  body,
  city,
  category_slug,
  subcategory,
  is_pinned,
  view_count,
  rent_price_text,
  deposit_text,
  housing_type,
  beds,
  baths,
  address_text,
  available_text,
  contact_text,
  author_id
)
select
  '[예시] Holland 타운홈 2베드 렌트 — $1,450/월',
  E'점검용 예시 매물입니다. (실제 매물이 아닙니다)\n\n위치\n- Holland 시내 인근, 조용한 주거 단지\n- 학교·마트 차로 5~10분\n\n포함\n- 세탁기·건조기\n- 주차 2대\n- 중앙 에어컨\n\n조건\n- 월세 $1,450 / 디파짓 $1,450\n- 소형 반려동물 가능 (펫 디파짓 별도)\n- 입주: 즉시 협의\n\n문의는 아래 연락처로 부탁드려요.',
  'Holland',
  'housing',
  'rent',
  false,
  12,
  '$1,450 /월',
  '$1,450',
  'condo',
  '2',
  '1.5',
  'Holland, MI (시내 인근)',
  '즉시 입주 가능',
  '문자 616-555-0142 (예시)',
  (select id from public.profiles order by created_at asc nulls last limit 1)
where not exists (
  select 1
  from public.posts
  where category_slug = 'housing'
    and title = '[예시] Holland 타운홈 2베드 렌트 — $1,450/월'
);
