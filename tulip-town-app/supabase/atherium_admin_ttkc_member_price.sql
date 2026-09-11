-- Additive patch: per-member monthly price override
-- Run in Tulip Town Supabase SQL Editor (safe to re-run).

alter table public.member_promotions
  add column if not exists price_cents_override integer;

alter table public.member_promotions
  drop constraint if exists member_promotions_price_cents_override_check;

alter table public.member_promotions
  add constraint member_promotions_price_cents_override_check
  check (price_cents_override is null or price_cents_override >= 0);

comment on column public.member_promotions.price_cents_override is
  'Optional per-member monthly price in cents. Null = use global pricing_settings.';


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

drop function if exists public.atherium_ttkc_set_promo(text, uuid, text, date, uuid);
drop function if exists public.atherium_ttkc_set_promo(text, uuid, text, date, uuid, integer);

create or replace function public.atherium_ttkc_set_promo(
  p_secret text,
  p_profile_id uuid,
  p_product_key text,
  p_promo_end_date date,
  p_actor_id uuid default null,
  p_price_cents_override integer default null
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
  if p_price_cents_override is not null and p_price_cents_override < 0 then
    raise exception 'price_cents_override must be >= 0';
  end if;

  insert into public.member_promotions (
    profile_id, product_key, promo_end_date, price_cents_override, updated_by, updated_at
  )
  values (
    p_profile_id,
    trim(p_product_key),
    p_promo_end_date,
    p_price_cents_override,
    p_actor_id,
    now()
  )
  on conflict (profile_id, product_key) do update
    set promo_end_date = excluded.promo_end_date,
        price_cents_override = excluded.price_cents_override,
        updated_by = excluded.updated_by,
        updated_at = now()
  returning * into row;

  return row_to_json(row);
end;
$$;

revoke all on function public.atherium_ttkc_set_promo(text, uuid, text, date, uuid, integer) from public;
grant execute on function public.atherium_ttkc_set_promo(text, uuid, text, date, uuid, integer) to anon, authenticated;

