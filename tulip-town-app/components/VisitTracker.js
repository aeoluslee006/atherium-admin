'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const VISITOR_KEY = 'ttkc_visitor_key';

function getVisitorKey() {
  try {
    let key = localStorage.getItem(VISITOR_KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, key);
    }
    return key;
  } catch {
    return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

export default function VisitTracker() {
  useEffect(() => {
    let cancelled = false;

    async function track() {
      try {
        const visitor_key = getVisitorKey();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        await supabase.from('site_visits').insert({
          visitor_key,
          user_id: user?.id || null,
          path: window.location.pathname,
        });
      } catch {
        // Table may not exist until SQL migration is applied.
      }
    }

    track();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
