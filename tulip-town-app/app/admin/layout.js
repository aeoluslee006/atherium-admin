import Link from 'next/link';

const LINKS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/members', label: '회원 관리' },
  { href: '/admin/sellers', label: '판매자 승인' },
  { href: '/admin/pricing', label: '요금 설정' },
  { href: '/admin/payments', label: '결제 확인' },
];

export default function AdminLayout({ children }) {
  return (
    <div className="container admin-wrap">
      <div className="row-between" style={{ marginBottom: 18 }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            관리자 · Admin
          </h2>
          <div className="hint-text">TTKC 내장 관리 패널 (/admin)</div>
        </div>
        <Link href="/" className="btn btn-outline">
          사이트로
        </Link>
      </div>
      <nav className="admin-nav">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="admin-nav-link">
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
