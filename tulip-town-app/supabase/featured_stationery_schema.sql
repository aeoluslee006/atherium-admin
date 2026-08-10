-- Featured / 좋은글 stationery support
-- Run in Supabase SQL Editor once.

alter table public.posts
  add column if not exists is_featured boolean not null default false,
  add column if not exists stationery_id text;

comment on column public.posts.is_featured is
  'When true, post appears in the home dashboard 좋은글 panel.';

comment on column public.posts.stationery_id is
  'Letter-paper theme id for 좋은글 posts (e.g. cream-lined, sage-leaf).';

create index if not exists posts_is_featured_idx
  on public.posts (is_featured)
  where is_featured = true;

create index if not exists posts_subcategory_featured_idx
  on public.posts (category_slug, subcategory)
  where subcategory = 'featured';
