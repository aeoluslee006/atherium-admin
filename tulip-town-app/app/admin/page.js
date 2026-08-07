import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div className="category-grid">
      <Link href="/admin/members" className="category-card">
        <div className="ko">회원 관리</div>
        <div className="en">Members</div>
        <div className="desc">정지 · 강제 퇴출 · 검색</div>
      </Link>
      <Link href="/admin/shop" className="category-card">
        <div className="ko">튤립가게 승인</div>
        <div className="en">Shop listings</div>
        <div className="desc">승인 시 3개월 무료 · 결제 없음</div>
      </Link>
      <Link href="/admin/pricing" className="category-card">
        <div className="ko">요금 설정</div>
        <div className="en">Pricing</div>
        <div className="desc">디렉토리 $10 · 특별광고 $30 · 가게 $10</div>
      </Link>
      <Link href="/admin/payments" className="category-card">
        <div className="ko">결제 확인</div>
        <div className="en">Payments</div>
        <div className="desc">Stripe 구독 상태 (보류 중)</div>
      </Link>
    </div>
  );
}
