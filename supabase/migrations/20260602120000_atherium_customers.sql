-- ATHERIUM Holdings customer registry (shared cosmonova Supabase project)

create table if not exists public.atherium_customers (
  id uuid primary key default gen_random_uuid(),
  system_name text not null,
  company_name text not null,
  email text not null,
  industry text,
  subscription_status text not null default '무료체험',
  features jsonb not null default '[]'::jsonb,
  monthly_fee text,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create index if not exists atherium_customers_system_name_idx
  on public.atherium_customers (system_name);

create index if not exists atherium_customers_status_idx
  on public.atherium_customers (status);

create index if not exists atherium_customers_created_at_idx
  on public.atherium_customers (created_at desc);

alter table public.atherium_customers enable row level security;

drop policy if exists "atherium_customers_auth_select" on public.atherium_customers;
create policy "atherium_customers_auth_select"
  on public.atherium_customers
  for select
  to authenticated
  using (true);

drop policy if exists "atherium_customers_auth_insert" on public.atherium_customers;
create policy "atherium_customers_auth_insert"
  on public.atherium_customers
  for insert
  to authenticated
  with check (true);

drop policy if exists "atherium_customers_auth_update" on public.atherium_customers;
create policy "atherium_customers_auth_update"
  on public.atherium_customers
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "atherium_customers_auth_delete" on public.atherium_customers;
create policy "atherium_customers_auth_delete"
  on public.atherium_customers
  for delete
  to authenticated
  using (true);

-- Add customers via Supabase Table Editor or the admin dashboard.
