import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div className="category-grid">
      <Link href="/admin/members" className="category-card">
        <div className="ko">회원 관리</div>
        <div className="en">Members</div>
        <div className="desc">등급 · 프로모션 · 홀드/삭제 · 문의 메시지</div>
      </Link>
      <Link href="/admin/pricing" className="category-card">
        <div className="ko">요금 설정</div>
        <div className="en">Pricing</div>
        <div className="desc">지면 등급 · 특별광고 · 튤립샵 단가</div>
      </Link>
      <Link href="/admin/directory-pages" className="category-card">
        <div className="ko">지면 광고</div>
        <div className="en">Directory</div>
        <div className="desc">슬롯 개별가 · 강제 만료</div>
      </Link>
      <Link href="/admin/sellers" className="category-card">
        <div className="ko">사업자 입점</div>
        <div className="en">Sellers</div>
        <div className="desc">승인 · 반려</div>
      </Link>
      <Link href="/admin/shop" className="category-card">
        <div className="ko">튤립가게 승인</div>
        <div className="en">Shop listings</div>
        <div className="desc">리스팅(구)</div>
      </Link>
      <Link href="/admin/payments" className="category-card">
        <div className="ko">결제 확인</div>
        <div className="en">Payments</div>
        <div className="desc">Stripe 구독 상태</div>
      </Link>
    </div>
  );
}
