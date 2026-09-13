'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { paymentLinkHostname } from '../lib/paymentLink';

export default function ShopPaymentLinkButton({ paymentLink }) {
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
        💳 온라인으로 결제하기
      </button>
      <p className="shop-pay-disclaimer">
        ⚠ 외부 결제 서비스로 연결되며, TTKC는 결제에 관여하지 않습니다.
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
              TTKC를 벗어납니다
            </h2>
            <p className="shop-pay-modal-body">
              판매자가 연결한 외부 결제 페이지
              {hostname ? `(${hostname})` : ''}로 이동합니다. 결제는 해당 서비스에서
              처리되며, TTKC는 이 거래에 관여하지 않습니다.
            </p>
            <div className="shop-pay-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="btn"
                ref={continueRef}
                onClick={handleContinue}
              >
                계속하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
