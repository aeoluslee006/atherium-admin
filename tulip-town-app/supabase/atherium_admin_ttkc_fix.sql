-- ATHERIUM TTKC admin fix: drop points UI data, per-product promos, messages, status.
-- Run in Supabase SQL Editor after previous atherium_admin_*.sql migrations.

-- 1) Per-product member promotions (replaces profiles.promo_end_date)
create table if not exists public.member_promotions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_key text not null,
  promo_end_date date,
  price_cents_override integer,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (profile_id, product_key)
);

create index if not exists member_promotions_profile_idx
  on public.member_promotions (profile_id);

alter table public.member_promotions enable row level security;

-- Migrate old single promo column if present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'promo_end_date'
  ) then
    insert into public.member_promotions (profile_id, product_key, promo_end_date)
    select id, 'directory_listing', promo_end_date
    from public.profiles
    where promo_end_date is not null
    on conflict (profile_id, product_key) do update
      set promo_end_date = excluded.promo_end_date,
          updated_at = now();
  end if;
end $$;

-- 2) Admin messages (idempotent)
create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_messages_profile_id_idx on public.admin_messages (profile_id);
create index if not exists admin_messages_unread_idx
  on public.admin_messages (is_read, created_at desc)
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

-- 3) Ensure profile status
alter table public.profiles
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('active', 'hold', 'deleted'));
  end if;
end $$;

-- 4) Overview without points; prefer status columns
create or replace function public.atherium_ttkc_overview(p_secret text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  perform public.atherium_assert_secret(p_secret);

  select json_build_object(
    'total_visitors', (select count(*)::int from public.site_visits),
    'unique_visitors', (select count(distinct visitor_key)::int from public.site_visits),
    -- Michigan (America/Detroit) calendar day
    'today_visitors', (
      select count(*)::int from public.site_visits
      where created_at >= (timezone('America/Detroit', now()))::date
                         at time zone 'America/Detroit'
        and created_at <  ((timezone('America/Detroit', now()))::date + 1)
                         at time zone 'America/Detroit'
    ),
    'today_unique_visitors', (
      select count(distinct visitor_key)::int from public.site_visits
      where created_at >= (timezone('America/Detroit', now()))::date
                         at time zone 'America/Detroit'
        and created_at <  ((timezone('America/Detroit', now()))::date + 1)
                         at time zone 'America/Detroit'
    ),
    'member_count', (select count(*)::int from public.profiles),
    'active_members', (
      select count(*)::int from public.profiles
      where coalesce(status, 'active') = 'active'
        and coalesce(is_banned, false) = false
        and (suspended_until is null or suspended_until < now())
    ),
    'banned_members', (
      select count(*)::int from public.profiles
      where coalesce(status, 'active') = 'deleted'
         or coalesce(is_banned, false) = true
    ),
    'suspended_members', (
      select count(*)::int from public.profiles
      where coalesce(status, 'active') = 'hold'
         or (suspended_until is not null and suspended_until >= now()
             and coalesce(status, 'active') = 'active'
             and coalesce(is_banned, false) = false)
    ),
    'unread_messages', (
      select count(*)::int from public.admin_messages where is_read = false
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.atherium_ttkc_overview(text) from public;
grant execute on function public.atherium_ttkc_overview(text) to anon, authenticated;

-- 5) Members list: tier, status, unread, promotions (no points)
create or replace function public.atherium_ttkc_members(p_secret text, p_q text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  q text := lower(trim(coalesce(p_q, '')));
begin
  perform public.atherium_assert_secret(p_secret);

  select coalesce(json_agg(row_to_json(m) order by m.created_at desc), '[]'::json)
  into result
  from (
    select
      p.id,
      p.display_name,
      coalesce(p.email, u.email, '') as email,
      coalesce(p.phone, '') as phone,
      coalesce(p.is_admin, false) as is_admin,
      coalesce(p.is_moderator, false) as is_moderator,
      coalesce(p.status, 'active') as status,
      coalesce(p.is_banned, false) as is_banned,
      p.banned_reason,
      p.suspended_until,
      p.created_at,
      coalesce(t.tier, case
        when coalesce(p.is_admin, false) then 'super_admin'
        when coalesce(p.is_moderator, false) then 'black'
        else 'bronze'
      end) as tier,
      (
        select count(*)::int from public.admin_messages am
        where am.profile_id = p.id and am.is_read = false
      ) as unread_messages,
      coalesce((
        select json_agg(json_build_object(
          'product_key', mp.product_key,
          'promo_end_date', mp.promo_end_date,
          'price_cents_override', mp.price_cents_override
        ) order by mp.product_key)
        from public.member_promotions mp
        where mp.profile_id = p.id
      ), '[]'::json) as promotions
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join public.member_tier_view t on t.profile_id = p.id
    where q = ''
       or lower(coalesce(p.display_name, '')) like '%' || q || '%'
       or lower(coalesce(p.email, u.email, '')) like '%' || q || '%'
       or coalesce(p.phone, '') like '%' || q || '%'
    order by p.created_at desc
    limit 500
  ) m;

  return result;
end;
$$;

revoke all on function public.atherium_ttkc_members(text, text) from public;
grant execute on function public.atherium_ttkc_members(text, text) to anon, authenticated;

-- 6) Moderate → status hold / deleted / active
create or replace function public.atherium_ttkc_moderate_member(
  p_secret text,
  p_id uuid,
  p_action text,
  p_reason text default null,
  p_days integer default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles%rowtype;
begin
  perform public.atherium_assert_secret(p_secret);

  select * into target from public.profiles where id = p_id;
  if not found then
    raise exception 'member not found';
  end if;
  if coalesce(target.is_admin, false) then
    raise exception 'admin accounts cannot be moderated';
  end if;

  if p_action in ('ban', 'delete') then
    update public.profiles
    set status = 'deleted',
        banned_reason = nullif(trim(coalesce(p_reason, '')), '')
    where id = p_id
    returning * into target;
  elsif p_action in ('suspend', 'hold') then
    update public.profiles
    set status = 'hold',
        banned_reason = nullif(trim(coalesce(p_reason, '')), '')
    where id = p_id
    returning * into target;
  elsif p_action in ('clear', 'unhold', 'activate') then
    update public.profiles
    set status = 'active',
        banned_reason = null,
        suspended_until = null,
        is_banned = false
    where id = p_id
    returning * into target;
  else
    raise exception 'unknown action';
  end if;

  return row_to_json(target);
end;
$$;

revoke all on function public.atherium_ttkc_moderate_member(text, uuid, text, text, integer) from public;
grant execute on function public.atherium_ttkc_moderate_member(text, uuid, text, text, integer) to anon, authenticated;

-- 7) Upsert member promotion
create or replace function public.atherium_ttkc_set_promo(
  p_secret text,
  p_profile_id uuid,
  p_product_key text,
  p_promo_end_date date,
  p_actor_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.member_promotions%rowtype;
begin
  perform public.atherium_assert_secret(p_secret);
  if p_product_key is null or length(trim(p_product_key)) = 0 then
    raise exception 'product_key required';
  end if;

  insert into public.member_promotions (profile_id, product_key, promo_end_date, updated_by, updated_at)
  values (p_profile_id, trim(p_product_key), p_promo_end_date, p_actor_id, now())
  on conflict (profile_id, product_key) do update
    set promo_end_date = excluded.promo_end_date,
        updated_by = excluded.updated_by,
        updated_at = now()
  returning * into row;

  return row_to_json(row);
end;
$$;

revoke all on function public.atherium_ttkc_set_promo(text, uuid, text, date, uuid) from public;
grant execute on function public.atherium_ttkc_set_promo(text, uuid, text, date, uuid) to anon, authenticated;

-- 8) List / mark messages
create or replace function public.atherium_ttkc_member_messages(p_secret text, p_profile_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  perform public.atherium_assert_secret(p_secret);
  select coalesce(json_agg(row_to_json(m) order by m.created_at desc), '[]'::json)
  into result
  from (
    select id, profile_id, message, is_read, created_at
    from public.admin_messages
    where profile_id = p_profile_id
    order by created_at desc
    limit 100
  ) m;
  return result;
end;
$$;

revoke all on function public.atherium_ttkc_member_messages(text, uuid) from public;
grant execute on function public.atherium_ttkc_member_messages(text, uuid) to anon, authenticated;

create or replace function public.atherium_ttkc_mark_messages_read(p_secret text, p_profile_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.atherium_assert_secret(p_secret);
  update public.admin_messages
  set is_read = true
  where profile_id = p_profile_id and is_read = false;
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.atherium_ttkc_mark_messages_read(text, uuid) from public;
grant execute on function public.atherium_ttkc_mark_messages_read(text, uuid) to anon, authenticated;

-- 9) Pricing list / update via bridge
create or replace function public.atherium_ttkc_pricing_list(p_secret text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  perform public.atherium_assert_secret(p_secret);
  select coalesce(json_agg(row_to_json(p) order by p.key), '[]'::json)
  into result
  from public.pricing_settings p;
  return result;
end;
$$;

revoke all on function public.atherium_ttkc_pricing_list(text) from public;
grant execute on function public.atherium_ttkc_pricing_list(text) to anon, authenticated;

create or replace function public.atherium_ttkc_pricing_update(
  p_secret text,
  p_key text,
  p_amount_cents integer,
  p_label text default null,
  p_is_active boolean default null,
  p_actor_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.pricing_settings%rowtype;
  tier text;
begin
  perform public.atherium_assert_secret(p_secret);

  update public.pricing_settings
  set
    amount_cents = coalesce(p_amount_cents, amount_cents),
    label = coalesce(nullif(trim(coalesce(p_label, '')), ''), label),
    is_active = coalesce(p_is_active, is_active),
    updated_by = p_actor_id,
    updated_at = now()
  where key = p_key
  returning * into row;

  if not found then
    raise exception 'pricing key not found';
  end if;

  if p_key like 'directory_%' and p_amount_cents is not null then
    tier := replace(p_key, 'directory_', '');
    update public.directory_slots
    set base_price_cents = p_amount_cents
    where size_tier = tier;
  end if;

  return row_to_json(row);
end;
$$;

revoke all on function public.atherium_ttkc_pricing_update(text, text, integer, text, boolean, uuid) from public;
grant execute on function public.atherium_ttkc_pricing_update(text, text, integer, text, boolean, uuid) to anon, authenticated;

-- Seed directory / special pricing keys if missing
insert into public.pricing_settings (key, label, amount_cents, currency, is_active)
values
  ('directory_small', '지면 소형 (월)', 300, 'usd', true),
  ('directory_medium', '지면 중형 (월)', 500, 'usd', true),
  ('directory_large', '지면 대형 (월)', 900, 'usd', true),
  ('directory_ultra', '지면 울트라 (월)', 1800, 'usd', true),
  ('special_ad_addon', '첫 페이지 특별광고 추가 (월)', 200, 'usd', true),
  ('tulip_shop', '튤립몰 월 구독', 1000, 'usd', true),
  ('directory_listing', '업체 디렉토리(레거시)', 1000, 'usd', true),
  ('seller_monthly', '셀러 월 구독', 1500, 'usd', true)
on conflict (key) do nothing;

-- See also atherium_admin_ttkc_member_price.sql for price_cents_override on set_promo.
