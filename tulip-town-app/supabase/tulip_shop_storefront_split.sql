-- Tulip shop storefront split: product category + annual seller plans
-- Run in Supabase SQL editor after deploy.

alter table public.products
  add column if not exists category text;

alter table public.products
  add column if not exists image_urls text[];

-- Soften legacy "first 3 months free" marketing on monthly label.
-- Approval still may set sponsors.trial_ends_at (+3 months) in admin;
-- member_promotions remain the per-member promo system (separate).
update public.pricing_settings
set label = '일반 셀러 (월 · 최대 6개 상품)',
    amount_cents = 1000,
    is_active = true,
    updated_at = now()
where key = 'shop_monthly';

update public.pricing_settings
set label = '프로 셀러 (월 · 최대 20개 상품)',
    amount_cents = 2000,
    is_active = true,
    updated_at = now()
where key = 'shop_upgrade_monthly';

insert into public.pricing_settings (key, label, amount_cents, currency, is_active)
values
  ('shop_yearly', '일반 셀러 (연 · 최대 6개 · 2개월 무료)', 10000, 'usd', true),
  ('shop_upgrade_yearly', '프로 셀러 (연 · 최대 20개 · 2개월 무료)', 20000, 'usd', true)
on conflict (key) do update set
  label = excluded.label,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  is_active = excluded.is_active,
  updated_at = now();
