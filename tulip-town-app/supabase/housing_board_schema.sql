-- Housing / 렌트·부동산 board fields (HeyKorean-style detail, text-only list)
-- Run in Supabase SQL Editor

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
  add column if not exists contact_text text,
  add column if not exists image_urls text;

create index if not exists posts_housing_subcategory_idx
  on public.posts (category_slug, subcategory)
  where category_slug = 'housing';

-- Optional QA sample (same as seed_housing_sample.sql)
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
  E'점검용 예시 매물입니다. (실제 매물이 아닙니다)\n\n위치\n- Holland 시내 인근\n\n월세 $1,450 / 디파짓 $1,450 · 즉시 입주 가능',
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
