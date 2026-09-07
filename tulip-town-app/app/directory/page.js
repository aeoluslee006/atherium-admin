import DirectoryPagesView from '../../components/DirectoryPagesView';
import DirectorySpecialSlider from '../../components/DirectorySpecialSlider';
import { SPECIAL_AD_CAPACITY } from '../../lib/directorySpecialAds';
import { loadDirectoryPages } from '../../lib/loadDirectoryPages';
import { tryAdminSupabase } from '../../lib/apiAuth';
import { supabaseRest } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '업체 디렉토리 지면 · Tulip Town',
  description: '교차로 스타일 지면에서 빈 자리를 눌러 광고를 신청하세요',
};

async function loadLiveSpecialAds() {
  try {
    const admin = tryAdminSupabase();
    if (admin) {
      const { data, error } = await admin
        .from('directory_slot_ads')
        .select(
          'id,ad_title,ad_phone,special_image_url,ad_image_url,category_slug,directory_slots(page_number,position_label,size_tier)'
        )
        .eq('status', 'active')
        .eq('is_special', true)
        .is('special_queue_position', null)
        .order('created_at', { ascending: true })
        .limit(SPECIAL_AD_CAPACITY);
      if (error) throw error;
      return data || [];
    }
    const rows = await supabaseRest(
      `directory_slot_ads?select=id,ad_title,ad_phone,special_image_url,ad_image_url,category_slug,directory_slots(page_number,position_label,size_tier)&status=eq.active&is_special=eq.true&special_queue_position=is.null&order=created_at.asc&limit=${SPECIAL_AD_CAPACITY}`
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export default async function DirectoryPage({ searchParams }) {
  const [pages, specialAds] = await Promise.all([loadDirectoryPages(), loadLiveSpecialAds()]);
  const initialPage = Number(searchParams?.page) || pages[0]?.pageNumber || 1;

  return (
    <div className="container dir-pages-page">
      {pages.length ? (
        <>
          <DirectorySpecialSlider ads={specialAds} />
          <p className="dir-pages-hint">
            빈 자리는 누구나 신청할 수 있고, 이미 올라간 광고는 올린 본인만 수정할 수 있습니다.
            블랙 레벨은 맨 끝 <strong>+</strong> 면에서 슬롯을 드래그해 새 페이지를 추가할 수 있습니다.
            울트라·대형·중형 신청 시 첫 페이지 특별광고 슬라이드(+$2/월)를 추가할 수 있습니다.
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
