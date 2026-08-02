-- TTKC signup profile fields (run in Supabase SQL Editor)
-- Adds US-style name, home address, and public username (아이디)

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists address text,
  add column if not exists username text;

-- Public username uniqueness (case-insensitive)
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null and username <> '';

-- Keep profile in sync on auth signup
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
begin
  v_username := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  v_first := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  v_last := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');

  insert into public.profiles (
    id,
    email,
    display_name,
    phone,
    first_name,
    last_name,
    address,
    username
  )
  values (
    new.id,
    new.email,
    coalesce(
      v_username,
      nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    nullif(new.raw_user_meta_data->>'phone', ''),
    v_first,
    v_last,
    nullif(trim(coalesce(new.raw_user_meta_data->>'address', '')), ''),
    v_username
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        phone = coalesce(public.profiles.phone, excluded.phone),
        first_name = coalesce(public.profiles.first_name, excluded.first_name),
        last_name = coalesce(public.profiles.last_name, excluded.last_name),
        address = coalesce(public.profiles.address, excluded.address),
        username = coalesce(public.profiles.username, excluded.username);
  return new;
end;
$$;
