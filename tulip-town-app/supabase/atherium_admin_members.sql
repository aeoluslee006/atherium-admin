-- ATHERIUM tulip-town admin phase 1: member status, promo, messages, action log, pricing keys.
-- Run once in Supabase SQL editor.

-- 1) Profile status + promo (status is source of truth; is_banned/suspended_until read-only legacy)
alter table public.profiles
  add column if not exists status text not null default 'active',
  add column if not exists promo_end_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('active', 'hold', 'deleted'));
  end if;
end $$;

-- Backfill status from legacy columns (one-time)
update public.profiles
set status = 'deleted'
where coalesce(is_banned, false) = true
  and status = 'active';

update public.profiles
set status = 'hold'
where status = 'active'
  and suspended_until is not null
  and suspended_until > now();

comment on column public.profiles.status is
  'Source of truth: active | hold | deleted. Legacy is_banned/suspended_until are read-only compat.';
comment on column public.profiles.promo_end_date is
  'Member-level free promo end date; set on first paid checkout (+20 days) unless already set.';

create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_promo_end_date_idx on public.profiles (promo_end_date);

-- 2) Member → admin messages
create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_messages_profile_id_idx on public.admin_messages (profile_id);
create index if not exists admin_messages_unread_idx on public.admin_messages (is_read, created_at desc)
  where is_read = false;

alter table public.admin_messages enable row level security;

drop policy if exists "users insert own admin_messages" on public.admin_messages;
create policy "users insert own admin_messages"
  on public.admin_messages for insert
  to authenticated
  with check (auth.uid() = profile_id);

drop policy if exists "users read own admin_messages" on public.admin_messages;
create policy "users read own admin_messages"
  on public.admin_messages for select
  to authenticated
  using (auth.uid() = profile_id);

-- Admin reads/updates via service role

-- 3) Admin action audit log
create table if not exists public.admin_action_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_log_target_idx
  on public.admin_action_log (target_profile_id, created_at desc);
create index if not exists admin_action_log_actor_idx
  on public.admin_action_log (actor_id, created_at desc);

alter table public.admin_action_log enable row level security;
-- service role only

-- 4) Directory tier + special addon pricing keys
insert into public.pricing_settings (key, label, amount_cents, currency, is_active)
values
  ('directory_small', '지면 소형 (월)', 300, 'usd', true),
  ('directory_medium', '지면 중형 (월)', 500, 'usd', true),
  ('directory_large', '지면 대형 (월)', 900, 'usd', true),
  ('directory_ultra', '지면 울트라 (월)', 1800, 'usd', true),
  ('special_ad_addon', '첫 페이지 특별광고 추가 (월)', 200, 'usd', true)
on conflict (key) do update
set
  label = excluded.label,
  amount_cents = excluded.amount_cents,
  is_active = excluded.is_active,
  updated_at = now();

-- Sync existing slot base prices from tier keys (optional one-shot)
update public.directory_slots s
set base_price_cents = p.amount_cents
from public.pricing_settings p
where p.key = 'directory_' || s.size_tier
  and p.is_active = true;
