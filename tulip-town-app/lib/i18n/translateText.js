/**
 * Free-tier machine translation helpers (no API key required).
 * Prefer Google gtx, fall back to MyMemory.
 */

const MAX_CHUNK = 1400;

function chunkText(text, max = MAX_CHUNK) {
  const raw = String(text || '');
  if (raw.length <= max) return [raw];
  const parts = [];
  let rest = raw;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.4) cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.4) cut = max;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

async function translateViaGoogle(text, from, to) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
    encodeURIComponent(from) +
    '&tl=' +
    encodeURIComponent(to) +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 TulipTownTranslate/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google translate HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.[0])) throw new Error('Unexpected Google translate payload');
  return data[0].map((row) => row?.[0] || '').join('');
}

async function translateViaMyMemory(text, from, to) {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=' +
    encodeURIComponent(`${from}|${to}`);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (!out) throw new Error(data?.responseDetails || 'MyMemory empty');
  return String(out);
}

export async function translateText(text, { from = 'auto', to = 'en' } = {}) {
  const input = String(text || '');
  if (!input.trim()) return '';

  const source = from === 'auto' ? 'auto' : from;
  const chunks = chunkText(input);
  const out = [];

  for (const chunk of chunks) {
    try {
      out.push(await translateViaGoogle(chunk, source === 'auto' ? 'auto' : source, to));
    } catch {
      out.push(await translateViaMyMemory(chunk, source === 'auto' ? 'ko' : source, to));
    }
  }

  return out.join('\n').trim();
}

export async function translatePair(title, body, { from = 'ko', to = 'en' } = {}) {
  const [titleOut, bodyOut] = await Promise.all([
    translateText(title, { from, to }),
    translateText(body, { from, to }),
  ]);
  return { title: titleOut, body: bodyOut };
}
