import Link from 'next/link';

export default function ShopLayout({ children }) {
  return (
    <div className="shop-shell">
      <div className="shop-shell-bar">
        <div className="container shop-shell-bar-inner">
          <Link href="/" className="shop-shell-exit">
            <span aria-hidden="true">←</span> 커뮤니티로 나가기
          </Link>
          <Link href="/shop" className="shop-shell-home">
            튤립가게
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
