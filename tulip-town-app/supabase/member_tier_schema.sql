-- Member tier system (phase 1): profiles fields + subscriptions + tier view + post counters
-- Project: lyikgkjhkmppvciicxfm
-- Run once in Supabase Dashboard → SQL Editor → Run
--
-- Notes against live schema (signup_profiles_schema.sql):
--   - profiles.is_admin (not is_admin alias)
--   - profiles.display_name
--   - posts.author_id
--   - comments.post_id / comments.author_id
-- Tier is computed (not stored). Black = is_moderator flag. Super admin = is_admin.

-- 1) profiles: account type, moderator flag, post activity counters
alter table public.profiles
  add column if not exists account_type text default 'individual',
  add column if not exists is_moderator boolean not null default false,
  add column if not exists post_count integer not null default 0,
  add column if not exists last_post_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type is null or account_type in ('individual', 'business'));
  end if;
end $$;

update public.profiles
set account_type = 'individual'
where account_type is null;

-- 2) subscriptions (paid tulip shop / directory products)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product_type text not null check (product_type in ('tulip_shop', 'directory_listing')),
  status text not null default 'active' check (status in ('active', 'expired', 'canceled')),
  period_start timestamptz,
  period_end timestamptz,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_profile_id_idx
  on public.subscriptions (profile_id);

create index if not exists subscriptions_active_idx
  on public.subscriptions (profile_id, product_type)
  where status = 'active';

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = profile_id);

drop policy if exists "subscriptions_admin_all" on public.subscriptions;
create policy "subscriptions_admin_all"
  on public.subscriptions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- 3) post_count / last_post_at trigger
create or replace function public.bump_profile_post_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_id is null then
    return new;
  end if;

  update public.profiles
  set
    post_count = coalesce(post_count, 0) + 1,
    last_post_at = coalesce(new.created_at, now())
  where id = new.author_id;

  return new;
end;
$$;

drop trigger if exists trg_posts_bump_profile_stats on public.posts;
create trigger trg_posts_bump_profile_stats
  after insert on public.posts
  for each row
  execute function public.bump_profile_post_stats();

-- One-time backfill from existing posts
update public.profiles p
set
  post_count = coalesce(s.cnt, 0),
  last_post_at = s.last_at
from (
  select author_id, count(*)::integer as cnt, max(created_at) as last_at
  from public.posts
  where author_id is not null
  group by author_id
) s
where p.id = s.author_id;

-- 4) computed tier view
-- Priority: is_admin → is_moderator → diamond → gold → silver → bronze
create or replace view public.member_tier_view as
select
  p.id as profile_id,
  case
    when p.is_admin then 'super_admin'
    when p.is_moderator then 'black'
    when coalesce(p.account_type, 'individual') = 'business'
      and exists (
        select 1
        from public.subscriptions s
        where s.profile_id = p.id
          and s.status = 'active'
          and s.product_type in ('tulip_shop', 'directory_listing')
      )
      then 'diamond'
    when coalesce(p.account_type, 'individual') = 'individual'
      and exists (
        select 1
        from public.subscriptions s
        where s.profile_id = p.id
          and s.status = 'active'
          and s.product_type = 'tulip_shop'
      )
      then 'gold'
    when coalesce(p.post_count, 0) >= 10
      and p.last_post_at is not null
      and p.last_post_at >= (now() - interval '90 days')
      then 'silver'
    else 'bronze'
  end as tier
from public.profiles p;

comment on view public.member_tier_view is
  'Computed member tier. Priority: super_admin > black > diamond > gold > silver > bronze.';

grant select on public.member_tier_view to authenticated, anon;
