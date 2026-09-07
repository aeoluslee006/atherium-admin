import Link from 'next/link';
import { redirect } from 'next/navigation';
import DirectoryPageComposer from '../../../components/DirectoryPageComposer';
import { createServerSupabase } from '../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function MyPageDirectoryPages() {
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
            <Link href="/mypage">← 마이페이지</Link>
          </p>
          <h1 className="mypage-title">지면 페이지 추가</h1>
          <p className="mypage-meta">
            블랙 레벨 · 소형 / 중형 / 중형(세로) / 대형(페이지 절반)을 자유롭게 조합해 새 면을 만듭니다.
          </p>
        </div>
      </header>

      <section className="mypage-section card" aria-labelledby="dir-compose-title">
        <div className="mypage-section-head">
          <h2 id="dir-compose-title">새 페이지 배치</h2>
          <Link href="/directory" className="btn btn-outline">
            디렉토리 보기
          </Link>
        </div>
        <DirectoryPageComposer />
      </section>
    </div>
  );
}
