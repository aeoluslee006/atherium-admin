-- Allow promo free-publish without SUPABASE_SERVICE_ROLE_KEY.
-- Owners can activate their own directory ads and claim an available slot.
-- Safe to re-run.

-- Own ads: insert / update / select
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'directory_slot_ads'
      and policyname = 'directory_slot_ads_owner_insert'
  ) then
    create policy directory_slot_ads_owner_insert
      on public.directory_slot_ads
      for insert
      to authenticated
      with check (submitted_by = auth.uid());
  end if;
exception when others then
  raise notice 'directory_slot_ads_owner_insert skipped: %', sqlerrm;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'directory_slot_ads'
      and policyname = 'directory_slot_ads_owner_update'
  ) then
    create policy directory_slot_ads_owner_update
      on public.directory_slot_ads
      for update
      to authenticated
      using (submitted_by = auth.uid())
      with check (submitted_by = auth.uid());
  end if;
exception when others then
  raise notice 'directory_slot_ads_owner_update skipped: %', sqlerrm;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'directory_slot_ads'
      and policyname = 'directory_slot_ads_owner_select'
  ) then
    create policy directory_slot_ads_owner_select
      on public.directory_slot_ads
      for select
      to authenticated
      using (submitted_by = auth.uid() or status = 'active');
  end if;
exception when others then
  raise notice 'directory_slot_ads_owner_select skipped: %', sqlerrm;
end $$;

-- Claim available slot when the caller already has a pending/active ad on it
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'directory_slots'
      and policyname = 'directory_slots_owner_claim'
  ) then
    create policy directory_slots_owner_claim
      on public.directory_slots
      for update
      to authenticated
      using (
        status = 'available'
        and exists (
          select 1
          from public.directory_slot_ads a
          where a.slot_id = directory_slots.id
            and a.submitted_by = auth.uid()
            and a.status in ('pending', 'active')
        )
      )
      with check (status = 'occupied');
  end if;
exception when others then
  raise notice 'directory_slots_owner_claim skipped: %', sqlerrm;
end $$;

-- Sponsors: allow owner insert (directory promo path)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sponsors'
      and policyname = 'sponsors_owner_insert'
  ) then
    create policy sponsors_owner_insert
      on public.sponsors
      for insert
      to authenticated
      with check (submitted_by = auth.uid());
  end if;
exception when others then
  raise notice 'sponsors_owner_insert skipped: %', sqlerrm;
end $$;
