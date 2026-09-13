-- Directory slot ads: text body + multi-image slider support
-- Run in Supabase SQL Editor once.

alter table public.directory_slot_ads
  add column if not exists ad_body text,
  add column if not exists ad_image_urls jsonb not null default '[]'::jsonb;

-- Allow pending drafts created at checkout before Stripe confirms payment.
do $$
begin
  alter table public.directory_slot_ads drop constraint if exists directory_slot_ads_status_check;
exception when undefined_object then
  null;
end $$;

alter table public.directory_slot_ads
  drop constraint if exists directory_slot_ads_status_check;

alter table public.directory_slot_ads
  add constraint directory_slot_ads_status_check
  check (status in ('pending', 'active', 'expired'));

-- Backfill first image into array when empty.
update public.directory_slot_ads
set ad_image_urls = jsonb_build_array(ad_image_url)
where (ad_image_urls is null or ad_image_urls = '[]'::jsonb)
  and ad_image_url is not null
  and length(trim(ad_image_url)) > 0;

comment on column public.directory_slot_ads.ad_body is 'Short ad copy shown on the newspaper cell';
comment on column public.directory_slot_ads.ad_image_urls is 'JSON array of image URLs for slider (max 5)';
