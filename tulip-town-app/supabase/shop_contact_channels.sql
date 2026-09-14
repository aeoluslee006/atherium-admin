-- Structured messenger / email contact for tulip shop sellers.
alter table public.sponsors
  add column if not exists contact_channels jsonb default '{}'::jsonb;

comment on column public.sponsors.contact_channels is
  'Seller contact channels: whatsapp/wechat/telegram/kakao handles + qr_url, plus email';
