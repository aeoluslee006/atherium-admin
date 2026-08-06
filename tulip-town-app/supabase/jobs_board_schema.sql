-- Jobs board fields (구인구직) — ChicagoChinaRen-style compose extras
-- Run once in Supabase SQL Editor.

alter table public.posts
  add column if not exists subcategory text,
  add column if not exists view_count integer not null default 0,
  add column if not exists company_name text,
  add column if not exists company_logo text,
  add column if not exists pay_text text,
  add column if not exists address_text text,
  add column if not exists contact_text text,
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists job_roles text;

create index if not exists posts_jobs_subcategory_idx
  on public.posts (category_slug, subcategory, created_at desc)
  where category_slug = 'jobs';

create or replace function public.increment_post_views(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.posts
  set view_count = coalesce(view_count, 0) + 1
  where id = p_id
  returning view_count into v_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.increment_post_views(uuid) to anon, authenticated;
