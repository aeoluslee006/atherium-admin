import { NextResponse } from 'next/server';
import { containsHangul } from '../../../../lib/i18n/detect';
import { translateText } from '../../../../lib/i18n/translateText';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = String(body.text || '').trim();
    const to = String(body.to || 'en').toLowerCase() === 'ko' ? 'ko' : 'en';
    const from = String(body.from || 'auto').toLowerCase();
    if (!text) {
      return NextResponse.json({ text: '', skipped: true });
    }

    // Skip if already target language enough (EN request + no Hangul).
    if (to === 'en' && !containsHangul(text)) {
      return NextResponse.json({ text, skipped: true });
    }
    if (to === 'ko' && containsHangul(text) && !/[A-Za-z]{4,}/.test(text)) {
      return NextResponse.json({ text, skipped: true });
    }

    const translated = await translateText(text, {
      from: from === 'auto' ? (containsHangul(text) ? 'ko' : 'auto') : from,
      to,
    });
    return NextResponse.json({ text: translated || text, skipped: false });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Translation failed' }, { status: 500 });
  }
}
