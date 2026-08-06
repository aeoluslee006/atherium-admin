-- 튤립가게 (Facebook Marketplace style listings on sponsors)
-- DB columns already applied in production; this file is idempotent.

alter table public.sponsors
  add column if not exists image_url text,
  add column if not exists contact text,
  add column if not exists price_text text,
  add column if not exists trial_ends_at timestamptz;

-- Ensure listing_type can be 'shop' (if check constraint exists, drop/recreate carefully)
do $$
begin
  -- no-op if unconstrained; app writes listing_type = 'shop'
  null;
end $$;

-- Final pricing (also already in pricing_settings)
insert into public.pricing_settings (key, label, amount_cents, currency, is_active)
values
  ('directory_monthly', '업체 디렉토리 월 등록료 · Business directory monthly', 1000, 'usd', true),
  ('premium_banner_monthly', '특별광고 프리미엄 배너 월 · Premium homepage banner monthly', 3000, 'usd', true),
  ('shop_monthly', '튤립가게 입점료 월 (첫 3개월 무료) · Tulip Shop monthly, first 3 months free', 1000, 'usd', true)
on conflict (key) do update set
  label = excluded.label,
  amount_cents = excluded.amount_cents,
  is_active = excluded.is_active,
  updated_at = now();

-- Public can read approved shop listings
-- (sponsors RLS may already allow approved reads via anon; if insert fails for members, check RLS)
