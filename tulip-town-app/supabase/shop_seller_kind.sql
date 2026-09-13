-- Optional seller kind for tulip shop (individual vs business).
-- Individuals can list without EIN / SOS; businesses still require review docs.
alter table public.sponsors
  add column if not exists seller_kind text default 'business';

comment on column public.sponsors.seller_kind is 'individual | business';
