-- Market board QA sample (optional)
-- Run after market_board_schema.sql

insert into public.posts (
  title,
  body,
  city,
  category_slug,
  subcategory,
  is_pinned,
  view_count,
  price_text,
  contact_text,
  image_urls,
  author_id
)
select
  '[예시] IKEA 소파 팝니다 — 상태 좋음',
  E'<p>점검용 예시 글입니다. (실제 판매 아님)</p><p>Holland 직거래 선호</p>',
  'Holland',
  'market',
  'sell',
  false,
  19,
  '$120',
  '문자 616-555-0177 (예시)',
  '["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80"]',
  (select id from public.profiles order by created_at asc nulls last limit 1)
where not exists (
  select 1
  from public.posts
  where category_slug = 'market'
    and title = '[예시] IKEA 소파 팝니다 — 상태 좋음'
);
