-- Deduplicate tulip shop pricing keys + add extra 10-pack (+$8).
-- Run once in Supabase SQL Editor.

-- Canonical basic plan is shop_monthly (not tulip_shop)
update public.pricing_settings
set label = '일반 셀러 (튤립몰 · 최대 6개 상품)',
    is_active = true,
    updated_at = now()
where key = 'shop_monthly';

-- Hide duplicate key from new sales (member_tier product_type may still use name tulip_shop)
update public.pricing_settings
set label = '레거시 키 (shop_monthly와 중복 · 미사용)',
    is_active = false,
    updated_at = now()
where key = 'tulip_shop';

update public.pricing_settings
set label = '프로 셀러 (튤립몰 · 기본 20개 · 이후 10개당 +$8)',
    updated_at = now()
where key = 'shop_upgrade_monthly';

insert into public.pricing_settings (key, label, amount_cents, currency, is_active)
values (
  'shop_extra_pack_monthly',
  '상품 10개 추가 (프로 셀러 · +$8/월)',
  800,
  'usd',
  true
)
on conflict (key) do update
set
  label = excluded.label,
  amount_cents = excluded.amount_cents,
  is_active = true,
  updated_at = now();
