export const CATEGORIES = [
  {
    slug: 'notice',
    nameKo: '공지사항',
    nameEn: 'Notices',
    desc: '사이트 공지 · Site announcements',
  },
  {
    slug: 'guide',
    nameKo: '정착 가이드',
    nameEn: 'Settlement Guide',
    desc: '새로 오셨나요? 여기서 시작하세요 · New to the area? Start here',
  },
  {
    slug: 'free',
    nameKo: '자유게시판',
    nameEn: 'Free Board',
    desc: '자유롭게 이야기해요 · General talk',
  },
  {
    slug: 'housing',
    nameKo: '렌트/부동산',
    nameEn: 'Housing',
    desc: '렌트 · 매매 · 룸메이트 · Rentals & real estate',
  },
  {
    slug: 'market',
    nameKo: '중고장터',
    nameEn: 'Marketplace',
    desc: '사고 팔기 · Buy & sell',
  },
  {
    slug: 'jobs',
    nameKo: '구인구직',
    nameEn: 'Jobs',
    desc: '구인 · 구직 · Hiring & job seeking',
  },
  {
    slug: 'classes',
    nameKo: '수업/교육',
    nameEn: 'Classes',
    desc: '수업 · 과외 · 교육 · Classes & tutoring',
  },
];

export function getCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}
