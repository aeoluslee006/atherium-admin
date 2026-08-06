-- Jobs board QA sample (run after jobs_board_schema.sql columns exist)
-- https://supabase.com/dashboard/project/lyikgkjhkmppvciicxfm/sql/new

insert into public.posts (
  title,
  body,
  city,
  category_slug,
  subcategory,
  is_pinned,
  view_count,
  company_name,
  pay_text,
  address_text,
  contact_name,
  contact_phone,
  contact_email,
  contact_text,
  job_roles,
  author_id
)
select
  '[예시] 서버/홀 스태프 모집 — Holland',
  E'<p><strong>1. 모집 직책</strong></p><p>서버 / 홀 스태프</p><p><strong>2. 담당 업무</strong></p><p>손님 응대, 주문 접수, 홀 정리</p><p><strong>3. 자격 요건</strong></p><p>책임감 · 밝은 태도 · 경력 무관</p><p><strong>4. 근무지 / 복지</strong></p><p>Holland 시내 · 주차 · 직원 식사 · 팁 별도</p><p><strong>5. 연락 방법</strong></p><p>문자/이메일 (실제 채용 아님 · QA용)</p>',
  'Holland',
  'jobs',
  'hire',
  false,
  28,
  'Tulip Town Kitchen (예시)',
  '$15+/hr · 팁 별도',
  'Holland, MI (시내)',
  '김매니저',
  '616-555-0199',
  'jobs.sample@ttkc.us',
  '김매니저 · 616-555-0199 · jobs.sample@ttkc.us',
  'server,fulltime,parttime-role',
  (select id from public.profiles order by created_at asc nulls last limit 1)
where not exists (
  select 1
  from public.posts
  where category_slug = 'jobs'
    and title = '[예시] 서버/홀 스태프 모집 — Holland'
);
