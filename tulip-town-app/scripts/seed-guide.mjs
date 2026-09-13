#!/usr/bin/env node
/**
 * Seed Settlement Guide category + pinned posts.
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-guide.mjs
 */
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const GUIDE = {
  slug: 'guide',
  name_ko: '정착 가이드',
  name_en: 'Settlement Guide',
  description: 'DMV·병원·마트 등 필수 정보 · Local essentials',
  sort_order: 1,
};

const POSTS = [
  {
    title: 'West Michigan DMV 이용 가이드',
    city: 'Holland',
    body: `미시간 운전면허·차량 등록은 Secretary of State (SOS)에서 처리합니다.

준비물
- 여권 또는 영주권/비자 서류
- Social Security Number (또는 ineligibility letter)
- 거주지 증명 2종 (렌트 계약서, 유틸리티 빌 등)
- 기존 면허(해당 시)

팁
- Holland / Grand Rapids 근처 SOS 지점은 예약이 수월합니다.
- Real ID가 필요하면 추가 서류를 미리 확인하세요.
- 한국어가 필요하면 커뮤니티에 동행을 요청해 보세요.

공식 사이트: https://www.michigan.gov/sos`,
  },
  {
    title: '근처 한인마트·식당 리스트',
    city: 'Grand Rapids',
    body: `West Michigan에서 자주 찾는 한인 장보기·식사 장소입니다. (정보 업데이트 환영)

장보기
- Grand Rapids / Kentwood 일대 아시안·한인 마켓
- Holland 인근에서는 GR 쪽으로 장보러 가는 경우가 많습니다.

식사
- 한식당·김밥·분식은 Grand Rapids 쪽이 선택지가 더 많습니다.
- 주말 저녁은 웨이팅이 있을 수 있으니 일찍 방문하세요.

TIP: 업체 디렉토리에 정확한 상호·전화번호를 등록해 주시면 커뮤니티에 큰 도움이 됩니다.`,
  },
  {
    title: '병원·소아과·한의원 찾기',
    city: 'Holland',
    body: `응급이 아니면 Primary Care / Urgent Care를 먼저 이용하세요.

보험
- 직장/마켓플레이스 보험 카드를 항상 지참하세요.
- 네트워크 병원인지 미리 확인하면 청구액 차이가 큽니다.

소아과
- 예방접종 기록(한국 기록 영문 번역)을 준비해 두면 첫 방문이 수월합니다.

언어
- 대형 병원은 interpreter 서비스를 요청할 수 있습니다.
- 한인 의사/클리닉 정보는 정착 가이드·디렉토리를 함께 참고하세요.

응급: 911`,
  },
  {
    title: '렌트/부동산 체크리스트',
    city: 'Holland',
    body: `계약 전 확인 리스트

1. 월세, 디파짓, 유틸리티 포함 여부
2. 리스 기간 / early termination 조항
3. 애완동물·흡연 규정
4. 주차, 세탁, 제설(snow removal) 책임
5. 입주 전 walkthrough 사진 기록

지역 팁
- Holland / Zeeland / Hudsonville는 조용한 주거 환경
- Grand Rapids는 직주·학교·한인 업체가 더 밀집

사기 주의: 현장 방문 없이 송금 요구하면 거절하세요. 의심되면 렌트/부동산 게시판에 먼저 물어보세요.`,
  },
  {
    title: '학군·학교 등록 안내 (Holland / GR)',
    city: 'Holland',
    body: `공립학교 등록 시 보통 필요한 것
- 거주지 증명
- 출생증명/여권
- 예방접종 기록
- 이전 학교 성적/전학 서류(해당 시)

학군
- 주소에 따라 attendance zone이 정해집니다.
- Holland, West Ottawa, Hudsonville, Grand Rapids 등 지역별 학군 사이트를 확인하세요.

ESL/ELL 지원이 있는 학교가 많으니, 등록 시 언어 지원을 요청하세요.
사립·교회 부설 학교 정보는 커뮤니티 후기를 참고하면 좋습니다.`,
  },
  {
    title: 'West Michigan 한인교회 안내',
    city: 'Holland',
    body: `교회는 정착 초기 정보·교제·자녀 활동의 중심이 되는 경우가 많습니다.

찾는 방법
- 주일 예배 시간 / 한국어 예배 여부
- 금요 청년부·토요 학교 여부
- Holland vs Grand Rapids 거리

방문 전 웹사이트·SNS로 예배 시간을 확인하세요.
새가족 환영 모임이 있는 곳이 많습니다.

이 글은 안내 목적이며, 특정 교회를 홍보하지 않습니다. 추천을 남기실 댓글을 이용해 주세요.`,
  },
  {
    title: '대중교통·운전·카풀 팁',
    city: 'Grand Rapids',
    body: `대중교통
- Grand Rapids: The Rapid 버스
- Holland 일대는 차량이 있으면 훨씬 편리합니다.

운전
- 겨울철 타이어·워셔액·비상키트 준비
- 학교 구역(school zone) 속도 제한 주의

카풀
- 출퇴근·장보기 카풀은 자유게시판을 활용하세요.
- 첫 카풀은 공공장소에서 만나세요.

공항
- 가까운 공항: Grand Rapids (GRR)
- 더 많은 노선: Detroit (DTW), Chicago 방면`,
  },
  {
    title: '응급·중요 연락처 모음',
    city: 'Holland',
    body: `즉시 저장해 두세요.

- 응급: 911
- Poison Control: 1-800-222-1222
- Michigan SOS(운전면허/차량): michigan.gov/sos
- 비응급 경찰/시 서비스: 거주지 non-emergency 번호 확인

의료
- 보험사 member services 번호
- Primary care / 소아과 예약 번호

생활
- 전기/가스/인터넷 고객센터
- 아파트 관리사무소 / 랜드로드

언어 지원이 필요하면 911에 interpreter를 요청할 수 있습니다.
추가 번호 제보는 댓글로 남겨 주세요.`,
  },
  {
    title: '은행·SSN·휴대폰 개통 순서',
    city: 'Holland',
    body: `추천 순서 (상황에 따라 다를 수 있음)

1. 여권/비자/I-94 등 신분 서류 정리
2. 은행 계좌 개설 (ITIN/SSN 정책은 은행마다 다름)
3. SSN 신청(자격 해당 시) 또는 ITIN 확인
4. 휴대폰 개통 (프리페이드로 시작해도 OK)
5. 운전면허 / Real ID
6. 보험·학교·렌트 유틸리티

팁
- 은행은 유학생/취업비자 계좌 경험이 있는 지점이 수월합니다.
- 휴대폰은 SSN 없이 개통 가능한 요금제를 먼저 비교하세요.
- 서류 사본은 클라우드와 출력본을 함께 보관하세요.`,
  },
];

async function main() {
  const { data: existing, error: listErr } = await supabase
    .from('categories')
    .select('slug,sort_order')
    .order('sort_order');
  if (listErr) throw listErr;

  const hasGuide = existing.some((c) => c.slug === 'guide');
  if (!hasGuide) {
    // bump sort_order >= 1
    for (const row of existing.filter((c) => c.sort_order >= 1).sort((a, b) => b.sort_order - a.sort_order)) {
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: row.sort_order + 1 })
        .eq('slug', row.slug);
      if (error) throw error;
    }
  }

  const { error: catErr } = await supabase.from('categories').upsert(GUIDE, { onConflict: 'slug' });
  if (catErr) throw catErr;
  console.log('category guide upserted');

  // optional admin user id
  let authorId = process.env.SEED_AUTHOR_ID || null;
  if (!authorId) {
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@tuliptown.app';
    const password = process.env.SEED_ADMIN_PASSWORD || 'TulipTownAdmin2026!';
    const { data: listed } = await supabase.auth.admin.listUsers({ perPage: 200 });
    const found = listed?.users?.find((u) => u.email === email);
    if (found) {
      authorId = found.id;
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) {
        console.warn('admin create skipped:', createErr.message);
      } else {
        authorId = created.user.id;
        console.log('created admin', email, authorId);
      }
    }
  }

  for (const post of POSTS) {
    const { data: exists } = await supabase
      .from('posts')
      .select('id')
      .eq('category_slug', 'guide')
      .eq('title', post.title)
      .maybeSingle();
    if (exists?.id) {
      console.log('skip existing', post.title);
      continue;
    }
    const row = {
      title: post.title,
      body: post.body,
      city: post.city,
      category_slug: 'guide',
      is_pinned: true,
    };
    if (authorId) row.author_id = authorId;
    const { error } = await supabase.from('posts').insert(row);
    if (error) throw error;
    console.log('inserted', post.title);
  }

  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('category_slug', 'guide')
    .eq('is_pinned', true);
  console.log('pinned guide posts:', count);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
