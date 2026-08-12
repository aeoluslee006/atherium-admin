import Link from 'next/link';
import DirectoryPagesView from '../../../components/DirectoryPagesView';
import { groupSlotsByPage } from '../../../lib/directorySlots';
import { supabaseRest } from '../../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '업체 디렉토리 지면 · Tulip Town',
  description: '교차로 스타일 지면에서 광고 자리를 확인하고 신청하세요',
};

async function loadSlotsWithAds() {
  try {
    const rows = await supabaseRest(
      'directory_slots?select=id,page_number,row_index,col_index,span_cols,span_rows,position_label,size_tier,base_price_cents,status,directory_slot_ads(id,slot_id,category_slug,ad_title,ad_image_url,ad_phone,status,period_end)&order=page_number.asc,row_index.asc,col_index.asc'
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    try {
      const slots = await supabaseRest(
        'directory_slots?select=*&order=page_number.asc,row_index.asc,col_index.asc'
      );
      const ads = await supabaseRest(
        'directory_slot_ads?select=*&status=eq.active'
      );
      const adBySlot = new Map();
      for (const ad of Array.isArray(ads) ? ads : []) {
        if (!adBySlot.has(ad.slot_id)) adBySlot.set(ad.slot_id, []);
        adBySlot.get(ad.slot_id).push(ad);
      }
      return (Array.isArray(slots) ? slots : []).map((s) => ({
        ...s,
        directory_slot_ads: adBySlot.get(s.id) || [],
      }));
    } catch {
      return [];
    }
  }
}

export default async function DirectoryPagesPage({ searchParams }) {
  const slots = await loadSlotsWithAds();
  // Normalize nested ads — PostgREST may return object for 1:1
  const normalized = slots.map((s) => {
    let ads = s.directory_slot_ads;
    if (ads && !Array.isArray(ads)) ads = [ads];
    if (Array.isArray(ads)) {
      ads = ads.filter((a) => a && a.status === 'active');
    }
    return { ...s, directory_slot_ads: ads || [] };
  });
  const pages = groupSlotsByPage(normalized);
  const initialPage = Number(searchParams?.page) || pages[0]?.pageNumber || 1;

  return (
    <div className="container dir-pages-page">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">업체 디렉토리 · 지면 보기</h2>
          <p className="hint-text">신문 지면처럼 자리를 확인하고, 빈 자리에 광고를 신청하세요.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/directory" className="btn btn-outline">
            리스트 보기
          </Link>
        </div>
      </div>

      {pages.length ? (
        <DirectoryPagesView pages={pages} initialPage={initialPage} />
      ) : (
        <div className="card empty-state">
          아직 등록된 지면 자리가 없습니다. 관리자가 페이지를 추가하면 여기에 표시됩니다.
        </div>
      )}
    </div>
  );
}
