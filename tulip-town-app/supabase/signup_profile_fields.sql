-- TTKC signup profile fields (run in Supabase SQL Editor)
-- Adds US-style name, split home address, and public username (아이디)

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists address text,
  add column if not exists address_street text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_zip text,
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
  v_street text;
  v_city text;
  v_state text;
  v_zip text;
  v_address text;
begin
  v_username := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  v_first := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  v_last := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
  v_street := nullif(trim(coalesce(new.raw_user_meta_data->>'address_street', '')), '');
  v_city := nullif(trim(coalesce(new.raw_user_meta_data->>'address_city', '')), '');
  v_state := nullif(trim(coalesce(new.raw_user_meta_data->>'address_state', '')), '');
  v_zip := nullif(trim(coalesce(new.raw_user_meta_data->>'address_zip', '')), '');
  v_address := nullif(trim(coalesce(new.raw_user_meta_data->>'address', '')), '');

  if v_address is null and v_street is not null then
    v_address := trim(concat_ws(', ', v_street, nullif(trim(concat_ws(' ', v_city, v_state, v_zip)), '')));
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    phone,
    first_name,
    last_name,
    address,
    address_street,
    address_city,
    address_state,
    address_zip,
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
    v_address,
    v_street,
    v_city,
    v_state,
    v_zip,
    v_username
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        phone = coalesce(public.profiles.phone, excluded.phone),
        first_name = coalesce(public.profiles.first_name, excluded.first_name),
        last_name = coalesce(public.profiles.last_name, excluded.last_name),
        address = coalesce(public.profiles.address, excluded.address),
        address_street = coalesce(public.profiles.address_street, excluded.address_street),
        address_city = coalesce(public.profiles.address_city, excluded.address_city),
        address_state = coalesce(public.profiles.address_state, excluded.address_state),
        address_zip = coalesce(public.profiles.address_zip, excluded.address_zip),
        username = coalesce(public.profiles.username, excluded.username);
  return new;
end;
$$;
