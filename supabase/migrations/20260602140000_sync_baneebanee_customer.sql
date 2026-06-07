-- Optional: persist BANEE & BANEE into atherium_customers for manual edits (MRR, notes, etc.)
-- The admin app also auto-derives Cosmonova tenants from locations + staff.

insert into public.atherium_customers
  (system_name, company_name, email, industry, subscription_status, features, monthly_fee, status)
select
  'cosmonova',
  'BANEE & BANEE',
  'baneebaneeusa@gmail.com',
  'Retail',
  '유료',
  '["POS","Inventory","Schedule","Dashboard","Admin"]'::jsonb,
  null,
  'Active'
where not exists (
  select 1 from public.atherium_customers
  where lower(company_name) = 'banee & banee'
    and lower(system_name) = 'cosmonova'
);
