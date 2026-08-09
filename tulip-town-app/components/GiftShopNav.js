'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { GIFT_SHOP } from '../lib/giftShop';

function GiftShopNavInner() {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat') || '';
  const tab = searchParams.get('tab') || '';

  const links = [
    {
      href: '/gift',
      label: '홈',
      active: pathname === '/gift' && !cat && tab !== 'deals',
    },
    {
      href: '/gift/best',
      label: '인기 BEST',
      active: pathname.startsWith('/gift/best'),
    },
    {
      href: '/gift?tab=deals',
      label: '지금 특가',
      active: pathname === '/gift' && tab === 'deals',
    },
    {
      href: '/gift?cat=community',
      label: '커뮤니티 특가',
      active: pathname === '/gift' && cat === 'community',
    },
  ];

  return (
    <nav className="gift-subnav" aria-label={`${GIFT_SHOP.nameKo} 메뉴`}>
      <div className="gift-subnav-inner">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={`gift-subnav-link${link.active ? ' is-active' : ''}`}>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function GiftShopNav() {
  return (
    <Suspense fallback={<div className="gift-subnav" />}>
      <GiftShopNavInner />
    </Suspense>
  );
}
