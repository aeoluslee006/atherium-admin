import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/signup?error=invalid_link', origin));
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    const signup = new URL('/signup', origin);
    signup.searchParams.set('error', 'link_expired');
    return NextResponse.redirect(signup);
  }

  const destination = next.startsWith('/') ? next : '/';
  return NextResponse.redirect(new URL(destination, origin));
}
