-- Classes board support (수업/교육)
-- Run in Supabase SQL Editor once.
-- Reuses contact_text / address_text if already added by market/housing/jobs schemas.

alter table public.posts
  add column if not exists view_count integer not null default 0,
  add column if not exists contact_text text,
  add column if not exists address_text text;

-- Rename legacy clubs category → classes (idempotent)
update public.categories
set
  slug = 'classes',
  name_ko = '수업/교육',
  name_en = 'Classes',
  description = '수업 · 과외 · 교육 · Classes & tutoring'
where slug = 'clubs';

insert into public.categories (slug, name_ko, name_en, description, sort_order)
select 'classes', '수업/교육', 'Classes', '수업 · 과외 · 교육 · Classes & tutoring', 6
where not exists (select 1 from public.categories where slug = 'classes');

update public.posts
set category_slug = 'classes'
where category_slug = 'clubs';

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
