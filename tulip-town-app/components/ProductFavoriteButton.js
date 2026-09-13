'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session?.access_token || ''}`,
  };
}

/** Heart toggle for shop cards / product detail. */
export default function ProductFavoriteButton({
  productId,
  initialFavorited = false,
  className = '',
  size = 'md',
  onChange,
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(!!initialFavorited);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (busy || !productId) return;

      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        const next = typeof window !== 'undefined' ? window.location.pathname : '/shop';
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      setBusy(true);
      const previous = favorited;
      setFavorited(!previous);
      onChange?.(!previous);
      try {
        const res = await fetch('/api/shop/favorites', {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({ product_id: productId }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || '찜 처리 실패');
        const next = !!payload.favorited;
        setFavorited(next);
        onChange?.(next);
      } catch {
        setFavorited(previous);
        onChange?.(previous);
      } finally {
        setBusy(false);
      }
    },
    [busy, favorited, onChange, productId, router]
  );

  return (
    <button
      type="button"
      className={`shop-fav-btn ${favorited ? 'is-on' : ''} shop-fav-btn--${size}${className ? ` ${className}` : ''}`}
      aria-label={favorited ? '찜 해제' : '찜하기'}
      aria-pressed={favorited}
      disabled={busy}
      onClick={toggle}
    >
      <span aria-hidden="true">{favorited ? '♥' : '♡'}</span>
    </button>
  );
}
