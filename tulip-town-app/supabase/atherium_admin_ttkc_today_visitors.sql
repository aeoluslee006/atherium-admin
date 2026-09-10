-- Additive patch: today visitor counts on atherium_ttkc_overview
-- Safe to re-run. Uses America/Detroit (Michigan) calendar day.

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
