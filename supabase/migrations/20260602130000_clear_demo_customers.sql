-- Optional: remove demo seed rows that were inserted during initial setup.
-- Run only if you want to start with an empty customer list.

delete from public.atherium_customers
where email in (
  'luna@lunastudio.com',
  'owner@bloomboutique.com',
  'admin@starfield.com',
  'cto@techflow.io',
  'info@metronail.com',
  'hello@sunrisecafe.com',
  'ops@apexlogistics.com'
);
