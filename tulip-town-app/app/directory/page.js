import DirectoryPagesView from '../../components/DirectoryPagesView';
import DirectorySpecialSlider from '../../components/DirectorySpecialSlider';
import { SPECIAL_AD_CAPACITY } from '../../lib/directorySpecialAds';
import { createServerT, getServerLocale } from '../../lib/i18n/server';
import { loadDirectoryPages } from '../../lib/loadDirectoryPages';
import { tryAdminSupabase } from '../../lib/apiAuth';
import { supabaseRest } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = getServerLocale();
  const t = createServerT(locale);
  return {
    title: t('directory.metaTitle'),
    description: t('directory.metaDesc'),
  };
}

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
  const locale = getServerLocale();
  const t = createServerT(locale);
  const [pages, specialAds] = await Promise.all([loadDirectoryPages(), loadLiveSpecialAds()]);
  const initialPage = Number(searchParams?.page) || pages[0]?.pageNumber || 1;

  return (
    <div className="container dir-pages-page">
      {pages.length ? (
        <>
          <DirectorySpecialSlider ads={specialAds} />
          <DirectoryPagesView pages={pages} initialPage={initialPage} />
        </>
      ) : (
        <div className="card empty-state">{t('directory.empty')}</div>
      )}
    </div>
  );
}
