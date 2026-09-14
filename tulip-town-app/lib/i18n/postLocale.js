import { containsHangul, detectSourceLang } from './detect';

/** Pick localized title/body for display. Falls back to original. */
export function localizePostFields(post, locale = 'ko') {
  if (!post) return { title: '', body: '', isTranslated: false, sourceLang: 'und' };
  const lang = locale === 'en' ? 'en' : 'ko';
  const sourceLang =
    post.source_lang || detectSourceLang(`${post.title || ''}\n${post.body || ''}`);

  if (lang === 'en') {
    const title = post.title_en || post.title || '';
    const body = post.body_en || post.body || '';
    const isTranslated = Boolean(post.title_en || post.body_en);
    return { title, body, isTranslated, sourceLang };
  }

  // Korean UI: prefer original. If original was English and we later add title_ko, use it.
  if (post.title_ko || post.body_ko) {
    return {
      title: post.title_ko || post.title || '',
      body: post.body_ko || post.body || '',
      isTranslated: Boolean(post.title_ko || post.body_ko),
      sourceLang,
    };
  }

  return {
    title: post.title || '',
    body: post.body || '',
    isTranslated: false,
    sourceLang,
  };
}

export function postNeedsEnTranslation(post) {
  if (!post) return false;
  if (post.title_en && post.body_en) return false;
  return containsHangul(`${post.title || ''}\n${post.body || ''}`);
}

export async function requestPostTranslation(postId, { wait = true } = {}) {
  if (!postId) return null;
  const run = fetch('/api/translate/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: postId }),
  }).then(async (res) => {
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || 'Translation failed');
    return payload;
  });

  if (!wait) {
    run.catch(() => {});
    return null;
  }
  return run;
}
