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
    desc: 'DMV·병원·마트 등 필수 정보 · Local essentials',
  },
  {
    slug: 'free',
    nameKo: '자유게시판',
    nameEn: 'Free Board',
    desc: '자유롭게 이야기해요 · General talk',
  },
  {
    slug: 'qna',
    nameKo: '질문답변',
    nameEn: 'Q&A',
    desc: '궁금한 걸 물어보세요 · Ask the community',
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
];

export function getCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}
