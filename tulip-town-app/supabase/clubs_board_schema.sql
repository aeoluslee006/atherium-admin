-- Clubs board support (동호회)
-- Run in Supabase SQL Editor once.
-- Reuses contact_text / address_text if already added by market/housing/jobs schemas.

alter table public.posts
  add column if not exists view_count integer not null default 0,
  add column if not exists contact_text text,
  add column if not exists address_text text;

-- Safe public view increment (no-op if already defined by market schema)
create or replace function public.increment_post_views(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.posts
  set view_count = coalesce(view_count, 0) + 1
  where id = p_id
  returning view_count into v_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.increment_post_views(uuid) to anon, authenticated;
