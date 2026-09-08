-- Tulip shop (/shop) sample sellers + products
-- Run in Supabase SQL editor (service role / dashboard).
-- Idempotent: fixed UUIDs with on conflict upsert.
-- Safe to re-run. Does not delete non-sample data.
--
-- Requires: public.sponsors, public.products
-- Optional: products.category (from tulip_shop_storefront_split.sql)

-- Pick an owner profile if present (else leave submitted_by null when allowed)
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
  values
    (
      'a1000000-0000-4000-8000-000000000001'::uuid,
      '[샘플] 홀랜드 베이커리',
      '123 Tulip Ave, Holland, MI',
      '11-1111111',
      'sample/sos-holland-bakery.pdf',
      'Holland',
      '문자 616-555-0101 (샘플)',
      '갓 구운 빵·쿠키와 선물세트를 파는 동네 베이커리입니다. (예시 판매자)',
      'shop',
      'approved',
      owner_id,
      'basic',
      6,
      now(),
      now()
    ),
    (
      'a1000000-0000-4000-8000-000000000002'::uuid,
      '[샘플] 그린샵 · 오뜨베',
      '88 Lake Shore Dr, Grand Rapids, MI',
      '22-2222222',
      'sample/sos-greenshop.pdf',
      'Grand Rapids',
      'kakao: greentulip (샘플)',
      '화분·셀프케어·생활 소품을 다루는 라이프스타일 샵입니다. (예시 판매자)',
      'shop',
      'approved',
      owner_id,
      'extended',
      20,
      now(),
      now()
    ),
    (
      'a1000000-0000-4000-8000-000000000003'::uuid,
      '[샘플] TTKC Picks',
      '45 Windmill Rd, Zeeland, MI',
      '33-3333333',
      'sample/sos-ttkc-picks.pdf',
      'Zeeland',
      'email: picks@example.com (샘플)',
      '한인 커뮤니티 추천 간식·피크닉·키즈 아이템 큐레이션. (예시 판매자)',
      'shop',
      'approved',
      owner_id,
      'basic',
      6,
      now(),
      now()
    ),
    (
      'a1000000-0000-4000-8000-000000000004'::uuid,
      '[샘플] 미시간 튤립 플로리스트',
      '9 Festival St, Holland, MI',
      '44-4444444',
      'sample/sos-florist.pdf',
      'Holland',
      '전화 616-555-0144 (샘플)',
      '시즌 튤립·꽃다발 전문. 직거래·픽업 가능. (예시 판매자)',
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
end $$;

-- Products (physical gift-style samples adapted from the old /gift static catalog)
insert into public.products (
  id,
  sponsor_id,
  title,
  description,
  price_cents,
  image_url,
  category,
  is_active,
  created_at
)
values
  (
    'b1000000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    '홀랜드 베이커리 선물세트',
    '갓 구운 빵·쿠키를 한 상자에. 이사 온 이웃이나 모임 답례로 딱이에요. (샘플 상품 · 실제 판매 아님)',
    2800,
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    'food',
    true,
    now() - interval '6 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    '그랜드래피즈 카페 기프트카드',
    '동네 카페에서 바로 쓸 수 있는 $20 카드. 부담 없는 마음 표현. (샘플 상품)',
    2000,
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    'food',
    true,
    now() - interval '5 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000003'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    '시나몬롤 주말 박스',
    '토요일 오전 픽업용 시나몬롤 6개 세트. 커피와 함께. (샘플 상품)',
    1800,
    'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=800&q=80',
    'food',
    true,
    now() - interval '2 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000004'::uuid,
    'a1000000-0000-4000-8000-000000000002'::uuid,
    '주말 셀프케어 세트',
    '크림·미스트·티를 한데 모은 휴식 세트. “수고했어요” 한마디에 곁들이기 좋아요. (샘플 상품)',
    3900,
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
    'beauty',
    true,
    now() - interval '7 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000005'::uuid,
    'a1000000-0000-4000-8000-000000000002'::uuid,
    '감사 미니 화분',
    '책상 위에 두는 작은 화분. 선생님·동료·이웃 감사 인사에 잘 맞아요. (샘플 상품)',
    1800,
    'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80',
    'home',
    true,
    now() - interval '4 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000006'::uuid,
    'a1000000-0000-4000-8000-000000000002'::uuid,
    '아로마 캔들 2종 세트',
    '라벤더·시트러스 미니 캔들. 집들이·생일 선물용. (샘플 상품)',
    2200,
    'https://images.unsplash.com/photo-1602607049382-1b0f0d0a0b0a?auto=format&fit=crop&w=800&q=80',
    'home',
    true,
    now() - interval '3 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000007'::uuid,
    'a1000000-0000-4000-8000-000000000003'::uuid,
    '한인마트 간식박스',
    '과자·음료·라면을 골라 담은 웰컴 박스. 새 가족 환영 선물로 인기예요. (샘플 상품)',
    3200,
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=800&q=80',
    'food',
    true,
    now() - interval '8 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000008'::uuid,
    'a1000000-0000-4000-8000-000000000003'::uuid,
    '아이 주말 액티비티 키트',
    '색칠·스티커·간단 실험까지. 비 오는 주말 선물로 반응이 좋아요. (샘플 상품)',
    2600,
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    'kids',
    true,
    now() - interval '5 days'
  ),
  (
    'b1000000-0000-4000-8000-000000000009'::uuid,
    'a1000000-0000-4000-8000-000000000003'::uuid,
    '가족 피크닉 세트',
    '매트·텀블러·간식 파우치. 홀랜드·윈드밀 공원 나들이용. (샘플 상품)',
    4500,
    'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
    'kids',
    true,
    now() - interval '1 day'
  ),
  (
    'b1000000-0000-4000-8000-00000000000a'::uuid,
    'a1000000-0000-4000-8000-000000000004'::uuid,
    '미시간 튤립 한 다발',
    '시즌에 맞춰 꽂은 생화 다발. 생일·감사·응원에 가장 많이 골라요. (샘플 상품)',
    2400,
    'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80',
    'home',
    true,
    now() - interval '9 days'
  ),
  (
    'b1000000-0000-4000-8000-00000000000b'::uuid,
    'a1000000-0000-4000-8000-000000000004'::uuid,
    '튤립 시즌 센터피스',
    '테이블 중앙용 소형 센터피스. 파티·브런치용. (샘플 상품)',
    3500,
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=800&q=80',
    'home',
    true,
    now() - interval '2 days'
  ),
  (
    'b1000000-0000-4000-8000-00000000000c'::uuid,
    'a1000000-0000-4000-8000-000000000004'::uuid,
    '드라이플라워 미니 부케',
    '오래 두고 보는 미니 드라이 부케. 책상·현관 포인트. (샘플 상품)',
    1600,
    'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=800&q=80',
    'home',
    true,
    now() - interval '12 hours'
  )
on conflict (id) do update set
  sponsor_id = excluded.sponsor_id,
  title = excluded.title,
  description = excluded.description,
  price_cents = excluded.price_cents,
  image_url = excluded.image_url,
  category = excluded.category,
  is_active = true;

-- If products.category column is missing, the insert above fails.
-- Fallback without category (run only if needed):
-- See comments at bottom.

/*
-- FALLBACK (no category column): delete the products insert above and use this instead.

insert into public.products (
  id, sponsor_id, title, description, price_cents, image_url, is_active, created_at
)
select id, sponsor_id, title, description, price_cents, image_url, is_active, created_at
from (values
  ...
) as v(id, sponsor_id, title, description, price_cents, image_url, is_active, created_at)
on conflict (id) do update set ...
*/
