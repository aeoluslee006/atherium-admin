-- TTKC member signup schema (current form)
-- Project: lyikgkjhkmppvciicxfm
-- Run once in Supabase Dashboard → SQL Editor → Run
--
-- Signup fields:
--   first_name, last_name, phone, email, username(아이디/공개),
--   password is stored in auth.users (not profiles)

create extension if not exists pgcrypto;

-- Ensure profiles table exists (safe if already present)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Signup / member columns
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists username text,
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_reason text,
  add column if not exists suspended_until timestamptz,
  add column if not exists points_purchased integer not null default 0,
  add column if not exists points_balance integer not null default 0;

-- Public username uniqueness (case-insensitive)
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

-- Helpful lookups
create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_phone_idx on public.profiles (phone);

-- Keep profile in sync when a user signs up via auth
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
    id,
    email,
    phone,
    first_name,
    last_name,
    username,
    display_name
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

-- RLS: members can read limited public identity; update own row
alter table public.profiles enable row level security;

drop policy if exists "profiles public read basic" on public.profiles;
create policy "profiles public read basic"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Backfill email from auth.users when empty
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

-- Optional: if old accounts only have display_name, copy into username when empty
update public.profiles
set username = lower(display_name)
where (username is null or btrim(username) = '')
  and display_name is not null
  and btrim(display_name) <> ''
  and display_name ~ '^[A-Za-z0-9._-]{3,20}$';
