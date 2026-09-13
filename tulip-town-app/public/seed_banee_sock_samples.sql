-- Tulip shop sample: BANEE & BANEE sock photos (demo only)
-- Run in Supabase SQL editor. Idempotent (fixed UUIDs).
-- Images sourced from https://www.baneebanee.com/collections/shoes

do $$
declare
  owner_id uuid;
begin
  select id into owner_id
  from public.profiles
  order by created_at asc nulls last
  limit 1;

  insert into public.sponsors (
    id,
    business_name,
    category,
    business_address,
    ein,
    sos_document_path,
    city,
    contact,
    description,
    listing_type,
    status,
    submitted_by,
    plan_tier,
    product_limit,
    approved_at,
    created_at
  )
  values (
    'a2000000-0000-4000-8000-0000000000b1'::uuid,
    '[샘플] BANEE 양말샵',
    'other',
    '100 Sample St, Holland, MI',
    '55-5555555',
    'sample/sos-banee-socks.pdf',
    'Holland',
    '문자 616-555-0199 (샘플)',
    'baneebanee.com 스타일 양말 샘플 판매자입니다. 실제 거래가 아닙니다.',
    'shop',
    'approved',
    owner_id,
    'basic',
    6,
    now(),
    now()
  )
  on conflict (id) do update set
    business_name = excluded.business_name,
    category = excluded.category,
    business_address = excluded.business_address,
    city = excluded.city,
    contact = excluded.contact,
    description = excluded.description,
    listing_type = 'shop',
    status = 'approved',
    plan_tier = excluded.plan_tier,
    product_limit = excluded.product_limit,
    approved_at = coalesce(public.sponsors.approved_at, excluded.approved_at),
    submitted_by = coalesce(public.sponsors.submitted_by, excluded.submitted_by);
exception
  when undefined_column then
    -- Fallback column names used by some environments
    insert into public.sponsors (
      id,
      business_name,
      category,
      city,
      contact,
      description,
      listing_type,
      status,
      submitted_by,
      created_at
    )
    values (
      'a2000000-0000-4000-8000-0000000000b1'::uuid,
      '[샘플] BANEE 양말샵',
      'other',
      'Holland',
      '문자 616-555-0199 (샘플)',
      'baneebanee.com 스타일 양말 샘플 판매자입니다. 실제 거래가 아닙니다.',
      'shop',
      'approved',
      owner_id,
      now()
    )
    on conflict (id) do update set
      business_name = excluded.business_name,
      category = excluded.category,
      city = excluded.city,
      contact = excluded.contact,
      description = excluded.description,
      listing_type = 'shop',
      status = 'approved',
      submitted_by = coalesce(public.sponsors.submitted_by, excluded.submitted_by);
end $$;

insert into public.products (
  id,
  sponsor_id,
  title,
  description,
  price_cents,
  image_url,
  category,
  shipping_scope,
  is_active,
  created_at
)
values
  (
    'b2000000-0000-4000-8000-0000000000b1'::uuid,
    'a2000000-0000-4000-8000-0000000000b1'::uuid,
    '롤링 엣지 양말 3족 세트',
    '크림·핑크·블랙 롤링 엣지 양말 3족. "LEAVE ME ALONE" 프린트. (샘플 · baneebanee.com 참고 이미지 · 실제 판매 아님)',
    1999,
    'https://cdn.shopify.com/s/files/1/0796/7853/8044/files/12.png?v=1711402961',
    'fashion',
    'nationwide',
    true,
    now() - interval '2 days'
  ),
  (
    'b2000000-0000-4000-8000-0000000000b2'::uuid,
    'a2000000-0000-4000-8000-0000000000b1'::uuid,
    '스누피 양말 세트',
    '그레이·블랙·베이지 스누피 프린트 양말 3족. 사이즈 6–11. (샘플 · 판매완료 데모)',
    1999,
    'https://cdn.shopify.com/s/files/1/0796/7853/8044/files/13.png?v=1711402762',
    'fashion',
    'nationwide',
    false,
    now() - interval '5 days'
  ),
  (
    'b2000000-0000-4000-8000-0000000000b3'::uuid,
    'a2000000-0000-4000-8000-0000000000b1'::uuid,
    '레오파드 프린트 양말 세트',
    '크림·핑크 레오파드 패턴 양말 2족. 남녀공용. (샘플 · baneebanee.com 참고 이미지 · 실제 판매 아님)',
    1399,
    'https://cdn.shopify.com/s/files/1/0796/7853/8044/files/1_d2d48301-24db-4ff8-9f94-aac0cde6ad4e.png?v=1707324476',
    'fashion',
    'local',
    true,
    now() - interval '1 day'
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  price_cents = excluded.price_cents,
  image_url = excluded.image_url,
  category = excluded.category,
  shipping_scope = excluded.shipping_scope,
  is_active = excluded.is_active;

-- Optional sample reviews on the sold sock (skip if table/profile missing)
do $$
declare
  reviewer uuid;
begin
  if to_regclass('public.product_reviews') is null then
    return;
  end if;

  select id into reviewer
  from public.profiles
  order by created_at asc nulls last
  limit 1;
  if reviewer is null then
    return;
  end if;

  insert into public.product_reviews (id, product_id, reviewer_id, comment, created_at)
  values
    (
      'c2000000-0000-4000-8000-0000000000b1'::uuid,
      'b2000000-0000-4000-8000-0000000000b2'::uuid,
      reviewer,
      '포장도 예쁘고 거래가 친절했어요!',
      now() - interval '1 day'
    )
  on conflict (product_id, reviewer_id) do update set
    comment = excluded.comment;
exception
  when others then
    raise notice 'sample review skipped: %', sqlerrm;
end $$;
