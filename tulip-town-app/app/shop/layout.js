'use client';

import Link from 'next/link';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLocale } from '../../components/LocaleProvider';

export default function ShopLayout({ children }) {
  const { t } = useLocale();

  return (
    <div className="shop-shell">
      <div className="shop-shell-bar">
        <div className="container shop-shell-bar-inner">
          <Link href="/" className="shop-shell-exit">
            <span aria-hidden="true">←</span> {t('shop.exit')}
          </Link>
          <div className="shop-shell-bar-right">
            <LanguageSwitcher />
            <Link href="/shop" className="shop-shell-home">
              {t('shop.home')}
            </Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
