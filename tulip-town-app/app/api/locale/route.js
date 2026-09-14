import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, normalizeLocale } from '../../../lib/i18n/locales';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const locale = normalizeLocale(body.locale);
    const res = NextResponse.json({ ok: true, locale });
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
