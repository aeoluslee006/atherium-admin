-- Marketplace support (중고장터)
-- Run in Supabase SQL Editor once.

-- View counter on posts
alter table public.posts
  add column if not exists view_count integer not null default 0,
  add column if not exists subcategory text;

-- Safe public view increment
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

-- Optional: public image bucket for marketplace paste uploads
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "post images public read" on storage.objects;
create policy "post images public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'post-images');

drop policy if exists "post images auth upload" on storage.objects;
create policy "post images auth upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "post images owner update" on storage.objects;
create policy "post images owner update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "post images owner delete" on storage.objects;
create policy "post images owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
