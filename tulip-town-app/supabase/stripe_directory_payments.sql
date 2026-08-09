-- Stripe directory payments: allow authenticated users to insert their own pending payment rows
-- (server still prefers SUPABASE_SERVICE_ROLE_KEY when available)

-- Ensure pricing row exists
insert into public.pricing_settings (key, label, amount_cents, currency, is_active)
values (
  'directory_monthly',
  '업체 디렉토리 월 등록료 · Business directory monthly listing',
  1500,
  'usd',
  true
)
on conflict (key) do nothing;

-- Owners may update their own pending listing after checkout confirm
-- (service role bypasses RLS; this is a fallback when service role is not set)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sponsors'
      and policyname = 'sponsors_owner_approve_after_pay'
  ) then
    create policy sponsors_owner_approve_after_pay
      on public.sponsors
      for update
      to authenticated
      using (submitted_by = auth.uid())
      with check (submitted_by = auth.uid());
  end if;
exception when others then
  raise notice 'sponsors policy skipped: %', sqlerrm;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_owner_insert'
  ) then
    create policy payments_owner_insert
      on public.payments
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.sponsors s
          where s.id = sponsor_id and s.submitted_by = auth.uid()
        )
      );
  end if;
exception when others then
  raise notice 'payments insert policy skipped: %', sqlerrm;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_owner_update'
  ) then
    create policy payments_owner_update
      on public.payments
      for update
      to authenticated
      using (
        exists (
          select 1 from public.sponsors s
          where s.id = sponsor_id and s.submitted_by = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.sponsors s
          where s.id = sponsor_id and s.submitted_by = auth.uid()
        )
      );
  end if;
exception when others then
  raise notice 'payments update policy skipped: %', sqlerrm;
end $$;
