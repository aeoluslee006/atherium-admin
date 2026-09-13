-- Tulip shop phase 6: light transaction reviews
-- Safe to re-run. No star ratings — "거래 좋아요" + optional one-line comment.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) not null,
  reviewer_id uuid references public.profiles(id) not null,
  comment text,
  created_at timestamptz default now(),
  unique (product_id, reviewer_id)
);

alter table public.product_reviews enable row level security;

drop policy if exists product_reviews_select_all on public.product_reviews;
create policy product_reviews_select_all
  on public.product_reviews
  for select
  to anon, authenticated
  using (true);

drop policy if exists product_reviews_insert_own on public.product_reviews;
create policy product_reviews_insert_own
  on public.product_reviews
  for insert
  to authenticated
  with check (reviewer_id = auth.uid());

drop policy if exists product_reviews_delete_own on public.product_reviews;
create policy product_reviews_delete_own
  on public.product_reviews
  for delete
  to authenticated
  using (reviewer_id = auth.uid());

create index if not exists product_reviews_product_id_idx
  on public.product_reviews (product_id);

create index if not exists product_reviews_reviewer_id_idx
  on public.product_reviews (reviewer_id);

grant select on public.product_reviews to anon, authenticated;
grant insert, delete on public.product_reviews to authenticated;
