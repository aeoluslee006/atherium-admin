import DirectoryPagesView from '../../components/DirectoryPagesView';
import { loadDirectoryPages } from '../../lib/loadDirectoryPages';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '업체 디렉토리 지면 · Tulip Town',
  description: '교차로 스타일 지면에서 빈 자리를 눌러 광고를 신청하세요',
};

export default async function DirectoryPage({ searchParams }) {
  const pages = await loadDirectoryPages();
  const initialPage = Number(searchParams?.page) || pages[0]?.pageNumber || 1;

  return (
    <div className="container dir-pages-page">
      {pages.length ? (
        <>
          <p className="dir-pages-hint">
            빈 자리를 누르면 광고 신청·이미지 업로드·결제 화면으로 이동합니다.
          </p>
          <DirectoryPagesView pages={pages} initialPage={initialPage} />
        </>
      ) : (
        <div className="card empty-state">
          아직 등록된 지면 자리가 없습니다. 관리자가 페이지를 추가하면 여기에 표시됩니다.
        </div>
      )}
    </div>
  );
}
