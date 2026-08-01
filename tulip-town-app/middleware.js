import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyikgkjhkmppvciicxfm.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWtna2poa21wcHZjaWljeGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTcwNjgsImV4cCI6MjEwMDc3MzA2OH0.cPJKE21nNjKwI7skeB3lvZr5y8yuY0WRmqfc_sjkkSY';

const FRAME_ANCESTORS = [
  "'self'",
  'https://atherium-admin.vercel.app',
  'https://atherium.cosmonova.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].join(' ');

function withFrameAncestors(response) {
  response.headers.set('Content-Security-Policy', `frame-ancestors ${FRAME_ANCESTORS}`);
  return response;
}

export async function middleware(request) {
  let response = withFrameAncestors(
    NextResponse.next({
      request: { headers: request.headers },
    })
  );

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        request.cookies.set({ name, value, ...options });
        response = withFrameAncestors(NextResponse.next({ request: { headers: request.headers } }));
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        request.cookies.set({ name, value: '', ...options });
        response = withFrameAncestors(NextResponse.next({ request: { headers: request.headers } }));
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname);
    return withFrameAncestors(NextResponse.redirect(login));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return withFrameAncestors(NextResponse.redirect(new URL('/', request.url)));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
