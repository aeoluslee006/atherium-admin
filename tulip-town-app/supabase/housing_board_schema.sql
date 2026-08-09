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
  add column if not exists contact_text text;

create index if not exists posts_housing_subcategory_idx
  on public.posts (category_slug, subcategory)
  where category_slug = 'housing';
