-- Localized mirror fields for community posts (KO originals stay in title/body).
alter table public.posts
  add column if not exists title_en text,
  add column if not exists body_en text,
  add column if not exists source_lang text,
  add column if not exists translated_at timestamptz;

comment on column public.posts.title_en is 'Auto-translated English title';
comment on column public.posts.body_en is 'Auto-translated English body';
comment on column public.posts.source_lang is 'Detected source language (ko/en/und)';
comment on column public.posts.translated_at is 'When title_en/body_en were last filled';
