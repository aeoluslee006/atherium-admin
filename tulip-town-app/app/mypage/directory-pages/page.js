import Link from 'next/link';
import { redirect } from 'next/navigation';
import DirectoryPageComposer from '../../../components/DirectoryPageComposer';
import { createServerT, getServerLocale } from '../../../lib/i18n/server';
import { createServerSupabase } from '../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function MyPageDirectoryPages() {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/mypage/directory-pages');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin, is_moderator')
    .eq('id', user.id)
    .maybeSingle();

  const allowed = Boolean(profile?.is_admin || profile?.is_moderator);
  if (!allowed) {
    redirect('/mypage');
  }

  return (
    <div className="container mypage">
      <header className="mypage-hero">
        <div className="mypage-hero-text">
          <p className="mypage-kicker">
            <Link href="/mypage">{t('mypage.back')}</Link>
          </p>
          <h1 className="mypage-title">{t('mypage.dirPagesTitle')}</h1>
          <p className="mypage-meta">{t('mypage.dirPagesMeta')}</p>
        </div>
      </header>

      <section className="mypage-section card" aria-labelledby="dir-compose-title">
        <div className="mypage-section-head">
          <h2 id="dir-compose-title">{t('mypage.dirPagesCompose')}</h2>
          <Link href="/directory" className="btn btn-outline">
            {t('mypage.dirPagesFromDir')}
          </Link>
        </div>
        <p className="hint-text" style={{ marginBottom: 12 }}>
          {t('mypage.dirPagesHint')}
        </p>
        <DirectoryPageComposer autoStart />
      </section>
    </div>
  );
}
