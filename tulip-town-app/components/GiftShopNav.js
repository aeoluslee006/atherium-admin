'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { GIFT_SHOP } from '../lib/giftShop';
import { useLocale } from './LocaleProvider';

function GiftShopNavInner() {
  const { t } = useLocale();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat') || '';
  const tab = searchParams.get('tab') || '';

  const links = [
    {
      href: '/gift',
      label: t('gift.home'),
      active: pathname === '/gift' && !cat && tab !== 'deals',
    },
    {
      href: '/gift/best',
      label: t('gift.best'),
      active: pathname.startsWith('/gift/best'),
    },
    {
      href: '/gift?tab=deals',
      label: t('gift.deals'),
      active: pathname === '/gift' && tab === 'deals',
    },
    {
      href: '/gift?cat=community',
      label: t('gift.community'),
      active: pathname === '/gift' && cat === 'community',
    },
    {
      href: '/mypage/shop',
      label: t('gift.seller'),
      active: pathname.startsWith('/mypage/shop') || pathname.startsWith('/seller'),
    },
  ];

  return (
    <nav className="gift-subnav" aria-label={t('gift.menuAria', { name: GIFT_SHOP.nameKo })}>
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
