-- TTKC: seed real (or starter) local news for the homepage panel
-- Project: lyikgkjhkmppvciicxfm
-- Run in Supabase Dashboard → SQL Editor → New query → Run
--
-- Homepage reads:
--   local_news where is_active = true
--   order by published_at desc
--   limit 4
-- When this table has rows, the yellow "샘플 뉴스" banner disappears.

insert into public.local_news (title, source, url, published_at, is_active)
values
  (
    '홀랜드 튤립 페스티벌, 올해도 West Michigan 관광객 몰려',
    'MLive',
    'https://www.mlive.com/',
    now() - interval '4 days',
    true
  ),
  (
    'Grand Rapids 한인 커뮤니티, 여름 피크닉 행사 안내',
    'TTKC',
    'https://tulip-town-app.vercel.app/',
    now() - interval '2 days',
    true
  ),
  (
    '미시간 운전면허·차량 등록, 신규 정착자 체크리스트',
    'Michigan.gov',
    'https://www.michigan.gov/',
    now() - interval '1 day',
    true
  ),
  (
    'Grand Rapids 주말 날씨·행사 모아보기',
    'WOOD TV',
    'https://www.woodtv.com/',
    now(),
    true
  );

-- Check
-- select id, title, source, url, published_at, is_active
-- from public.local_news
-- where is_active = true
-- order by published_at desc
-- limit 4;
