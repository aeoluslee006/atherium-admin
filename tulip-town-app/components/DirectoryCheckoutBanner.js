'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function DirectoryCheckoutBanner() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get('checkout');
  const sessionId = searchParams.get('session_id');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (checkout !== 'success') return;

    let cancelled = false;
    async function confirm() {
      if (!sessionId) {
        if (!cancelled) {
          setMessage('결제가 완료되었습니다. 승인 반영까지 잠시 걸릴 수 있습니다.');
        }
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const headers = { 'Content-Type': 'application/json' };
        if (sessionData.session?.access_token) {
          headers.Authorization = `Bearer ${sessionData.session.access_token}`;
        }
        const res = await fetch('/api/stripe/confirm', {
          method: 'POST',
          headers,
          body: JSON.stringify({ session_id: sessionId }),
        });
        const payload = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setMessage(payload.error || '결제 확인 중 오류가 발생했습니다.');
          return;
        }
        if (payload.warning) {
          setMessage(`결제 확인됨. ${payload.warning}`);
        } else {
          setMessage('결제가 완료되어 업체가 디렉토리에 등록되었습니다.');
        }
      } catch (err) {
        if (!cancelled) setMessage(err.message || '결제 확인에 실패했습니다.');
      }
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, [checkout, sessionId]);

  if (checkout !== 'success') return null;

  return (
    <div className="sponsor-banner">
      <span className="sponsor-badge">Payment</span>
      <span>{message || '결제 확인 중…'}</span>
      <Link href="/directory" className="btn btn-outline" style={{ marginLeft: 'auto' }}>
        새로고침
      </Link>
    </div>
  );
}
