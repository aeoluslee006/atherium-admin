-- 튤립가게 seller marketplace
-- Run in Supabase SQL Editor

-- Pricing: seller monthly subscription $15
insert into public.pricing_settings (key, label, amount_cents, currency, is_active)
values (
  'seller_monthly',
  '튤립가게 판매자 월 구독 · Seller plan (30 products)',
  1500,
  'usd',
  true
)
on conflict (key) do update set
  label = excluded.label,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  is_active = excluded.is_active;

create table if not exists public.gift_sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shop_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  city text not null,
  seller_type text not null default 'individual'
    check (seller_type in ('individual', 'business')),
  business_name text,
  bio text,
  pickup_note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'none'
    check (subscription_status in ('none', 'pending', 'active', 'past_due', 'canceled')),
  subscription_period_end timestamptz,
  stripe_account_id text,
  charges_enabled boolean not null default false,
  details_submitted boolean not null default false,
  product_limit integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists gift_sellers_status_idx on public.gift_sellers (status);
create index if not exists gift_sellers_subscription_idx on public.gift_sellers (subscription_status);

create table if not exists public.gift_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.gift_sellers (id) on delete cascade,
  name_ko text not null,
  name_en text,
  category text not null default 'local'
    check (category in ('local', 'care', 'kids', 'community')),
  blurb text not null default '',
  price_cents integer not null check (price_cents >= 0),
  compare_at_cents integer,
  image_url text,
  badge text,
  is_gift boolean not null default true,
  is_online_only boolean not null default false,
  is_published boolean not null default true,
  stock integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_products_seller_idx on public.gift_products (seller_id);
create index if not exists gift_products_published_idx on public.gift_products (is_published);

alter table public.gift_sellers enable row level security;
alter table public.gift_products enable row level security;

-- Sellers: owners manage own row; public can read approved+active shops lightly via products join
drop policy if exists gift_sellers_select_own on public.gift_sellers;
create policy gift_sellers_select_own
  on public.gift_sellers for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- Public can see approved+subscribed shop cards (needed for product joins)
drop policy if exists gift_sellers_public_catalog on public.gift_sellers;
create policy gift_sellers_public_catalog
  on public.gift_sellers for select to anon, authenticated
  using (status = 'approved' and subscription_status = 'active');

drop policy if exists gift_sellers_insert_own on public.gift_sellers;
create policy gift_sellers_insert_own
  on public.gift_sellers for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists gift_sellers_update_own on public.gift_sellers;
create policy gift_sellers_update_own
  on public.gift_sellers for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Public catalog: anyone can read published products from approved subscribed sellers
drop policy if exists gift_products_public_read on public.gift_products;
create policy gift_products_public_read
  on public.gift_products for select to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.gift_sellers s
      where s.id = seller_id
        and s.status = 'approved'
        and s.subscription_status = 'active'
    )
  );

drop policy if exists gift_products_owner_all on public.gift_products;
create policy gift_products_owner_all
  on public.gift_products for all to authenticated
  using (
    exists (
      select 1 from public.gift_sellers s
      where s.id = seller_id and (s.user_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    )
  )
  with check (
    exists (
      select 1 from public.gift_sellers s
      where s.id = seller_id and (s.user_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    )
  );

-- Admin list pending (authenticated admin already covered by select_own)
-- Allow public read of minimal seller shop name for product cards via security definer view optional later
