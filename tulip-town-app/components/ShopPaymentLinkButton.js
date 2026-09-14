'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { paymentLinkHostname } from '../lib/paymentLink';
import { useLocale } from './LocaleProvider';

export default function ShopPaymentLinkButton({ paymentLink }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const continueRef = useRef(null);
  const hostname = paymentLinkHostname(paymentLink);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    continueRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!paymentLink) return null;

  function handleContinue() {
    const a = document.createElement('a');
    a.href = paymentLink;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="btn shop-pay-btn"
        onClick={() => setOpen(true)}
      >
        {t('shop.pay.button')}
      </button>
      <p className="shop-pay-disclaimer">
        {t('shop.pay.disclaimer')}
      </p>

      {open ? (
        <div
          className="shop-pay-modal-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="shop-pay-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="shop-pay-modal-title">
              {t('shop.pay.leaving')}
            </h2>
            <p className="shop-pay-modal-body">
              {hostname
                ? t('shop.pay.modalBodyHost', { host: hostname })
                : t('shop.pay.modalBody')}
            </p>
            <div className="shop-pay-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn"
                ref={continueRef}
                onClick={handleContinue}
              >
                {t('common.continue')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
