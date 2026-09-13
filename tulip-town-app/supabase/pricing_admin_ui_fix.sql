-- Pricing admin cleanup: labels, pro seller 20, deactivate seller_monthly.
-- Run once in Supabase SQL Editor.

update public.pricing_settings
set label = '일반 셀러 (튤립몰 · 최대 6개 상품)',
    updated_at = now()
where key in ('tulip_shop', 'shop_monthly');

insert into public.pricing_settings (key, label, amount_cents, currency, is_active)
values ('shop_upgrade_monthly', '프로 셀러 (튤립몰 · 최대 20개 상품)', 2000, 'usd', true)
on conflict (key) do update
set label = '프로 셀러 (튤립몰 · 최대 20개 상품)',
    updated_at = now();

update public.pricing_settings
set label = '프로 셀러 (튤립몰 · 최대 20개 상품)',
    updated_at = now()
where key = 'shop_upgrade_monthly';

-- Soft-hide legacy seller plan (do not cancel existing subscriptions)
update public.pricing_settings
set is_active = false,
    label = '셀러 월 구독 (레거시 · 신규 판매 중단)',
    updated_at = now()
where key = 'seller_monthly';

-- Prefer directory_* keys; mark listing legacy inactive for new sales if unused
update public.pricing_settings
set label = '업체 디렉토리 레거시(미사용)',
    is_active = false,
    updated_at = now()
where key = 'directory_listing';

update public.pricing_settings
set label = case key
  when 'directory_small' then '지면 소형 (월)'
  when 'directory_medium' then '지면 중형 (월)'
  when 'directory_large' then '지면 대형 (월)'
  when 'directory_ultra' then '지면 울트라 (월)'
  when 'special_ad_addon' then '첫 페이지 특별광고 추가 (월)'
  else label
end,
updated_at = now()
where key in (
  'directory_small',
  'directory_medium',
  'directory_large',
  'directory_ultra',
  'special_ad_addon'
);

-- Cap already-extended shop sponsors at 20 (do not raise anyone above 20)
update public.sponsors
set product_limit = 20
where listing_type = 'shop'
  and plan_tier = 'extended'
  and coalesce(product_limit, 0) > 20;
