-- Directory pricing refresh + first-page special ads columns.
-- Run once in Supabase SQL editor.

-- 1) New monthly prices by size_tier
update public.directory_slots set base_price_cents = 300 where size_tier = 'small';
update public.directory_slots set base_price_cents = 500 where size_tier = 'medium';
update public.directory_slots set base_price_cents = 900 where size_tier = 'large';
update public.directory_slots set base_price_cents = 1800 where size_tier = 'ultra';

-- 2) Special slider fields on ads
alter table public.directory_slot_ads
  add column if not exists is_special boolean not null default false,
  add column if not exists special_image_url text,
  add column if not exists special_queue_position integer;

comment on column public.directory_slot_ads.is_special is
  'Opted into first-page special slider (+$2/mo).';
comment on column public.directory_slot_ads.special_image_url is
  'Wide banner image for special slider (800x400).';
comment on column public.directory_slot_ads.special_queue_position is
  'null = live in slider; positive int = waitlist FIFO order.';

create index if not exists directory_slot_ads_special_live_idx
  on public.directory_slot_ads (status, is_special, special_queue_position)
  where is_special = true and status = 'active';
