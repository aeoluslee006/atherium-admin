-- TTKC: Settlement Guide category + pinned posts (idempotent)
-- Run in Supabase SQL editor for project lyikgkjhkmppvciicxfm

-- Fixed sort order map (notice=0, guide=1, free=2, housing=3, …)
-- 지역뉴스는 categories가 아니라 local_news + /news 라우트
DELETE FROM public.categories WHERE slug = 'qna';
UPDATE public.categories SET sort_order = 0 WHERE slug = 'notice';
UPDATE public.categories SET sort_order = 2 WHERE slug = 'free';
UPDATE public.categories SET sort_order = 3 WHERE slug = 'housing';
UPDATE public.categories SET sort_order = 4 WHERE slug = 'market';
UPDATE public.categories SET sort_order = 5 WHERE slug = 'jobs';
UPDATE public.categories SET sort_order = 6 WHERE slug = 'clubs';

INSERT INTO public.categories (slug, name_ko, name_en, description, sort_order)
VALUES (
  'guide',
  '정착 가이드',
  'Settlement Guide',
  'DMV·병원·마트 등 필수 정보 · Local essentials',
  1
)
ON CONFLICT (slug) DO UPDATE
SET
  name_ko = EXCLUDED.name_ko,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Pinned guide posts (skip titles that already exist)
WITH seed(title, body, city) AS (
  VALUES
  (
    'West Michigan DMV 이용 가이드',
    E'미시간 운전면허·차량 등록은 Secretary of State (SOS)에서 처리합니다.\n\n준비물\n- 여권 또는 영주권/비자 서류\n- Social Security Number (또는 ineligibility letter)\n- 거주지 증명 2종 (렌트 계약서, 유틸리티 빌 등)\n- 기존 면허(해당 시)\n\n팁\n- Holland / Grand Rapids 근처 SOS 지점은 예약이 수월합니다.\n- Real ID가 필요하면 추가 서류를 미리 확인하세요.\n- 한국어가 필요하면 커뮤니티에 동행을 요청해 보세요.\n\n공식 사이트: https://www.michigan.gov/sos',
    'Holland'
  ),
  (
    '근처 한인마트·식당 리스트',
    E'West Michigan에서 자주 찾는 한인 장보기·식사 장소입니다. (정보 업데이트 환영)\n\n장보기\n- Grand Rapids / Kentwood 일대 아시안·한인 마켓\n- Holland 인근에서는 GR 쪽으로 장보러 가는 경우가 많습니다.\n\n식사\n- 한식당·김밥·분식은 Grand Rapids 쪽이 선택지가 더 많습니다.\n- 주말 저녁은 웨이팅이 있을 수 있으니 일찍 방문하세요.\n\nTIP: 업체 디렉토리에 정확한 상호·전화번호를 등록해 주시면 커뮤니티에 큰 도움이 됩니다.',
    'Grand Rapids'
  ),
  (
    '병원·소아과·한의원 찾기',
    E'응급이 아니면 Primary Care / Urgent Care를 먼저 이용하세요.\n\n보험\n- 직장/마켓플레이스 보험 카드를 항상 지참하세요.\n- 네트워크 병원인지 미리 확인하면 청구액 차이가 큽니다.\n\n소아과\n- 예방접종 기록(한국 기록 영문 번역)을 준비해 두면 첫 방문이 수월합니다.\n\n언어\n- 대형 병원은 interpreter 서비스를 요청할 수 있습니다.\n- 한인 의사/클리닉 정보는 정착 가이드·디렉토리를 함께 참고하세요.\n\n응급: 911',
    'Holland'
  ),
  (
    '렌트/부동산 체크리스트',
    E'계약 전 확인 리스트\n\n1. 월세, 디파짓, 유틸리티 포함 여부\n2. 리스 기간 / early termination 조항\n3. 애완동물·흡연 규정\n4. 주차, 세탁, 제설(snow removal) 책임\n5. 입주 전 walkthrough 사진 기록\n\n지역 팁\n- Holland / Zeeland / Hudsonville는 조용한 주거 환경\n- Grand Rapids는 직주·학교·한인 업체가 더 밀집\n\n사기 주의: 현장 방문 없이 송금 요구하면 거절하세요. 의심되면 렌트/부동산 게시판에 먼저 물어보세요.',
    'Holland'
  ),
  (
    '학군·학교 등록 안내 (Holland / GR)',
    E'공립학교 등록 시 보통 필요한 것\n- 거주지 증명\n- 출생증명/여권\n- 예방접종 기록\n- 이전 학교 성적/전학 서류(해당 시)\n\n학군\n- 주소에 따라 attendance zone이 정해집니다.\n- Holland, West Ottawa, Hudsonville, Grand Rapids 등 지역별 학군 사이트를 확인하세요.\n\nESL/ELL 지원이 있는 학교가 많으니, 등록 시 언어 지원을 요청하세요.\n사립·교회 부설 학교 정보는 커뮤니티 후기를 참고하면 좋습니다.',
    'Holland'
  ),
  (
    'West Michigan 한인교회 안내',
    E'교회는 정착 초기 정보·교제·자녀 활동의 중심이 되는 경우가 많습니다.\n\n찾는 방법\n- 주일 예배 시간 / 한국어 예배 여부\n- 금요 청년부·토요 학교 여부\n- Holland vs Grand Rapids 거리\n\n방문 전 웹사이트·SNS로 예배 시간을 확인하세요.\n새가족 환영 모임이 있는 곳이 많습니다.\n\n이 글은 안내 목적이며, 특정 교회를 홍보하지 않습니다. 추천을 남기실 댓글을 이용해 주세요.',
    'Holland'
  ),
  (
    '대중교통·운전·카풀 팁',
    E'대중교통\n- Grand Rapids: The Rapid 버스\n- Holland 일대는 차량이 있으면 훨씬 편리합니다.\n\n운전\n- 겨울철 타이어·워셔액·비상키트 준비\n- 학교 구역(school zone) 속도 제한 주의\n\n카풀\n- 출퇴근·장보기 카풀은 자유게시판을 활용하세요.\n- 첫 카풀은 공공장소에서 만나세요.\n\n공항\n- 가까운 공항: Grand Rapids (GRR)\n- 더 많은 노선: Detroit (DTW), Chicago 방면',
    'Grand Rapids'
  ),
  (
    '응급·중요 연락처 모음',
    E'즉시 저장해 두세요.\n\n- 응급: 911\n- Poison Control: 1-800-222-1222\n- Michigan SOS(운전면허/차량): michigan.gov/sos\n- 비응급 경찰/시 서비스: 거주지 non-emergency 번호 확인\n\n의료\n- 보험사 member services 번호\n- Primary care / 소아과 예약 번호\n\n생활\n- 전기/가스/인터넷 고객센터\n- 아파트 관리사무소 / 랜드로드\n\n언어 지원이 필요하면 911에 interpreter를 요청할 수 있습니다.\n추가 번호 제보는 댓글로 남겨 주세요.',
    'Holland'
  ),
  (
    '은행·SSN·휴대폰 개통 순서',
    E'추천 순서 (상황에 따라 다를 수 있음)\n\n1. 여권/비자/I-94 등 신분 서류 정리\n2. 은행 계좌 개설 (ITIN/SSN 정책은 은행마다 다름)\n3. SSN 신청(자격 해당 시) 또는 ITIN 확인\n4. 휴대폰 개통 (프리페이드로 시작해도 OK)\n5. 운전면허 / Real ID\n6. 보험·학교·렌트 유틸리티\n\n팁\n- 은행은 유학생/취업비자 계좌 경험이 있는 지점이 수월합니다.\n- 휴대폰은 SSN 없이 개통 가능한 요금제를 먼저 비교하세요.\n- 서류 사본은 클라우드와 출력본을 함께 보관하세요.',
    'Holland'
  )
)
INSERT INTO public.posts (title, body, city, category_slug, is_pinned)
SELECT s.title, s.body, s.city, 'guide', true
FROM seed s
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.category_slug = 'guide' AND p.title = s.title
);
