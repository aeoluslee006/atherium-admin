-- TTKC schema for Atherium native admin (run once in Supabase SQL Editor)
-- Project: lyikgkjhkmppvciicxfm
-- Bridge secret must match Atherium env ATHERIUM_TTKC_SECRET

create extension if not exists pgcrypto;

-- Member profile fields for Atherium list
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists points_purchased integer not null default 0,
  add column if not exists points_balance integer not null default 0;

-- Backfill emails from auth.users when empty
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

-- Visitor tracking
create table if not exists public.site_visits (
  id bigserial primary key,
  visitor_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  path text,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_at_idx on public.site_visits (created_at desc);
create index if not exists site_visits_visitor_key_idx on public.site_visits (visitor_key);

alter table public.site_visits enable row level security;

drop policy if exists "anon insert site_visits" on public.site_visits;
create policy "anon insert site_visits"
  on public.site_visits for insert
  to anon, authenticated
  with check (true);

drop policy if exists "no public read site_visits" on public.site_visits;
-- reads go through security definer RPCs only

-- Keep profile fields in sync on signup (matches current signup form)
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists username text;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_first text;
  v_last text;
  v_phone text;
  v_display text;
begin
  v_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  v_first := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  v_last := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
  v_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  v_display := coalesce(
    v_username,
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (
    id, email, phone, first_name, last_name, username, display_name
  )
  values (
    new.id,
    new.email,
    v_phone,
    v_first,
    v_last,
    v_username,
    v_display
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        phone = coalesce(excluded.phone, public.profiles.phone),
        first_name = coalesce(excluded.first_name, public.profiles.first_name),
        last_name = coalesce(excluded.last_name, public.profiles.last_name),
        username = coalesce(excluded.username, public.profiles.username),
        display_name = coalesce(excluded.display_name, public.profiles.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Bridge secret helper
create or replace function public.atherium_assert_secret(p_secret text)
returns void
language plpgsql
as $$
begin
  if p_secret is distinct from 'ttkc_ath_e9127d3e5003296d83a74efa2e7c83df03bd371e45bfa3f8' then
    raise exception 'unauthorized';
  end if;
end;
$$;

-- Overview stats for Atherium top cards
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
    'member_count', (select count(*)::int from public.profiles),
    'active_members', (
      select count(*)::int from public.profiles
      where coalesce(is_banned, false) = false
        and (suspended_until is null or suspended_until < now())
    ),
    'banned_members', (
      select count(*)::int from public.profiles where coalesce(is_banned, false) = true
    ),
    'suspended_members', (
      select count(*)::int from public.profiles
      where suspended_until is not null and suspended_until >= now()
    ),
    'points_purchased_total', (
      select coalesce(sum(points_purchased), 0)::int from public.profiles
    ),
    'points_balance_total', (
      select coalesce(sum(points_balance), 0)::int from public.profiles
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.atherium_ttkc_overview(text) from public;
grant execute on function public.atherium_ttkc_overview(text) to anon, authenticated;

-- Member list for Atherium table
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
      coalesce(p.points_purchased, 0) as points_purchased,
      coalesce(p.points_balance, 0) as points_balance,
      coalesce(p.is_admin, false) as is_admin,
      coalesce(p.is_banned, false) as is_banned,
      p.banned_reason,
      p.suspended_until,
      p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
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

-- Ban / suspend / clear
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
  until_ts timestamptz;
begin
  perform public.atherium_assert_secret(p_secret);

  select * into target from public.profiles where id = p_id;
  if not found then
    raise exception 'member not found';
  end if;
  if coalesce(target.is_admin, false) then
    raise exception 'admin accounts cannot be moderated';
  end if;

  if p_action = 'ban' then
    update public.profiles
    set is_banned = true,
        banned_reason = nullif(trim(coalesce(p_reason, '')), ''),
        suspended_until = null
    where id = p_id
    returning * into target;
  elsif p_action = 'suspend' then
    if p_days is null or p_days <= 0 then
      raise exception 'suspend days required';
    end if;
    until_ts := now() + make_interval(days => p_days);
    update public.profiles
    set is_banned = false,
        suspended_until = until_ts,
        banned_reason = nullif(trim(coalesce(p_reason, '')), '')
    where id = p_id
    returning * into target;
  elsif p_action = 'clear' then
    update public.profiles
    set is_banned = false,
        banned_reason = null,
        suspended_until = null
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
