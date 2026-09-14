import { NextResponse } from 'next/server';
import { detectSourceLang } from '../../../../lib/i18n/detect';
import { translatePair } from '../../../../lib/i18n/translateText';
import { createAdminSupabase } from '../../../../lib/supabaseAdmin';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || body.postId || '').trim();
    const force = Boolean(body.force);
    if (!id) {
      return NextResponse.json({ error: 'Post id is required.' }, { status: 400 });
    }

    let db;
    try {
      db = createAdminSupabase();
    } catch {
      return NextResponse.json({ error: 'Translation service is not configured.' }, { status: 503 });
    }

    const { data: post, error } = await db
      .from('posts')
      .select('id,title,body,title_en,body_en,source_lang')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

    if (!force && post.title_en && post.body_en) {
      return NextResponse.json({
        ok: true,
        cached: true,
        title_en: post.title_en,
        body_en: post.body_en,
        source_lang: post.source_lang || detectSourceLang(`${post.title}\n${post.body}`),
      });
    }

    const sourceLang = detectSourceLang(`${post.title || ''}\n${post.body || ''}`);
    if (sourceLang !== 'ko') {
      const patch = {
        title_en: post.title_en || post.title || null,
        body_en: post.body_en || post.body || null,
        source_lang: sourceLang,
        translated_at: new Date().toISOString(),
      };
      const { error: updateError } = await db.from('posts').update(patch).eq('id', id);
      if (updateError && /title_en|body_en|source_lang|translated_at/i.test(updateError.message || '')) {
        return NextResponse.json(
          { ok: false, skipped: true, error: 'Run supabase/post_translations.sql first.' },
          { status: 409 }
        );
      }
      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, cached: false, ...patch, skippedTranslate: true });
    }

    const translated = await translatePair(post.title || '', post.body || '', {
      from: 'ko',
      to: 'en',
    });

    const patch = {
      title_en: translated.title || null,
      body_en: translated.body || null,
      source_lang: 'ko',
      translated_at: new Date().toISOString(),
    };

    const { error: updateError } = await db.from('posts').update(patch).eq('id', id);
    if (updateError && /title_en|body_en|source_lang|translated_at/i.test(updateError.message || '')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Run supabase/post_translations.sql first.',
          title_en: patch.title_en,
          body_en: patch.body_en,
        },
        { status: 409 }
      );
    }
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, cached: false, ...patch });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Translation failed' }, { status: 500 });
  }
}
