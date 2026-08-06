/** Built-in QA sample for jobs board (shown until a real DB post exists). */
export const SAMPLE_JOBS_POST_ID = 'sample-jobs';

export const SAMPLE_JOBS_POST = {
  id: SAMPLE_JOBS_POST_ID,
  title: '[예시] 서버/홀 스태프 모집 — Holland',
  body: `<p><strong>1. 모집 직책</strong></p>
<p>서버 / 홀 스태프 (Full-time · Part-time)</p>
<p><strong>2. 담당 업무</strong></p>
<p>손님 응대, 주문 접수, 홀 정리, 간단한 캐셔 업무</p>
<p><strong>3. 자격 요건</strong></p>
<p>책임감 있고 밝은 태도 · 기본 영어 가능하면 우대 · 경력 무관</p>
<p><strong>4. 근무지 / 복지</strong></p>
<p>Holland 시내 · 주차 가능 · 직원 식사 제공 · 팁 별도</p>
<p><strong>5. 연락 방법</strong></p>
<p>문자 또는 이메일로 이름·가능 시간을 남겨 주세요. (실제 채용 아님 · QA용)</p>`,
  city: 'Holland',
  category_slug: 'jobs',
  subcategory: 'hire',
  is_pinned: false,
  created_at: '2026-08-06T14:00:00.000Z',
  view_count: 28,
  company_name: 'Tulip Town Kitchen (예시)',
  company_logo: null,
  pay_text: '$15+/hr · 팁 별도',
  address_text: 'Holland, MI (시내)',
  contact_name: '김매니저',
  contact_phone: '616-555-0199',
  contact_email: 'jobs.sample@ttkc.us',
  contact_text: '김매니저 · 616-555-0199 · jobs.sample@ttkc.us',
  job_roles: 'server,fulltime,parttime-role',
  author_id: null,
};

export function isSampleJobsPostId(id) {
  return String(id || '') === SAMPLE_JOBS_POST_ID;
}

export function getSampleJobsPost() {
  return { ...SAMPLE_JOBS_POST };
}
