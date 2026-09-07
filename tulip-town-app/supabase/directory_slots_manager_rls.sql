-- Allow black (is_moderator) / admin to manage directory_slots without service role.
-- Needed when Vercel has no SUPABASE_SERVICE_ROLE_KEY.
-- Run once in Supabase SQL editor.

create or replace function public.is_directory_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (coalesce(p.is_admin, false) or coalesce(p.is_moderator, false))
  );
$$;

revoke all on function public.is_directory_manager() from public;
grant execute on function public.is_directory_manager() to authenticated;

alter table public.directory_slots enable row level security;

drop policy if exists "directory_slots_manager_select" on public.directory_slots;
drop policy if exists "directory_slots_manager_insert" on public.directory_slots;
drop policy if exists "directory_slots_manager_update" on public.directory_slots;
drop policy if exists "directory_slots_manager_delete" on public.directory_slots;
drop policy if exists "directory_slots_public_select" on public.directory_slots;

-- Keep browsing open for the public directory.
create policy "directory_slots_public_select"
  on public.directory_slots
  for select
  to anon, authenticated
  using (true);

create policy "directory_slots_manager_insert"
  on public.directory_slots
  for insert
  to authenticated
  with check (public.is_directory_manager());

create policy "directory_slots_manager_update"
  on public.directory_slots
  for update
  to authenticated
  using (public.is_directory_manager())
  with check (public.is_directory_manager());

create policy "directory_slots_manager_delete"
  on public.directory_slots
  for delete
  to authenticated
  using (public.is_directory_manager());
