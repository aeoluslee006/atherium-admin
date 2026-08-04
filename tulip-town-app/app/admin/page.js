import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div className="category-grid">
      <Link href="/admin/members" className="category-card">
        <div className="ko">회원 관리</div>
        <div className="en">Members</div>
        <div className="desc">정지 · 강제 퇴출 · 검색</div>
      </Link>
      <Link href="/admin/sellers" className="category-card">
        <div className="ko">판매자 승인</div>
        <div className="en">Sellers</div>
        <div className="desc">튤립가게 입점 승인 · 정지</div>
      </Link>
      <Link href="/admin/pricing" className="category-card">
        <div className="ko">요금 설정</div>
        <div className="en">Pricing</div>
        <div className="desc">업체 디렉토리 · 판매자 월 구독</div>
      </Link>
      <Link href="/admin/payments" className="category-card">
        <div className="ko">결제 확인</div>
        <div className="en">Payments</div>
        <div className="desc">Stripe 구독 상태 모니터링</div>
      </Link>
    </div>
  );
}
