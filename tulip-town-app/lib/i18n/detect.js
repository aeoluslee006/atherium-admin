/** Rough language helpers for UGC translation. */

export function containsHangul(text) {
  return /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(String(text || ''));
}

export function detectSourceLang(text) {
  const raw = String(text || '').trim();
  if (!raw) return 'und';
  if (containsHangul(raw)) return 'ko';
  if (/[A-Za-z]/.test(raw)) return 'en';
  return 'und';
}
