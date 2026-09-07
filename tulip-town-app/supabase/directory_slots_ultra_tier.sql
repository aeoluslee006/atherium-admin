-- Allow size_tier = 'ultra' (full-page compose slot).
-- Run once in Supabase SQL editor if inserts with ultra fail on check constraint.

do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on c.conrelid = t.oid
  join pg_namespace n on t.relnamespace = n.oid
  where n.nspname = 'public'
    and t.relname = 'directory_slots'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%size_tier%'
  limit 1;

  if conname is not null then
    execute format('alter table public.directory_slots drop constraint %I', conname);
  end if;

  alter table public.directory_slots
    add constraint directory_slots_size_tier_check
    check (size_tier in ('small', 'medium', 'large', 'ultra'));
exception
  when duplicate_object then
    null;
end $$;
