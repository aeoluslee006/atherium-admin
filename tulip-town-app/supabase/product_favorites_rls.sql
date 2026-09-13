-- Tulip shop phase 5: wishlist RLS (table already created as product_favorites)
-- Safe to re-run.

alter table public.product_favorites enable row level security;

drop policy if exists product_favorites_select_own on public.product_favorites;
create policy product_favorites_select_own
  on public.product_favorites
  for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists product_favorites_insert_own on public.product_favorites;
create policy product_favorites_insert_own
  on public.product_favorites
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists product_favorites_delete_own on public.product_favorites;
create policy product_favorites_delete_own
  on public.product_favorites
  for delete
  to authenticated
  using (profile_id = auth.uid());

create index if not exists product_favorites_profile_id_idx
  on public.product_favorites (profile_id);

create index if not exists product_favorites_product_id_idx
  on public.product_favorites (product_id);

grant select, insert, delete on public.product_favorites to authenticated;
