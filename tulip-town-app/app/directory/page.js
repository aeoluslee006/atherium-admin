import Link from 'next/link';
import { Suspense } from 'react';
import DirectoryCheckoutBanner from '../../components/DirectoryCheckoutBanner';
import { supabaseRest } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export default async function DirectoryPage() {
  let sponsors = [];
  try {
    sponsors = await supabaseRest(
      'sponsors?select=*&status=eq.approved&order=created_at.desc'
    );
  } catch {
    sponsors = [];
  }

  return (
    <div className="container">
      <div className="row-between">
        <h2 className="section-title">업체 디렉토리 · Business Directory</h2>
        <Link href="/directory/new" className="btn">
          업체 등록
        </Link>
      </div>

      <Suspense fallback={null}>
        <DirectoryCheckoutBanner />
      </Suspense>

      {sponsors?.length ? (
        <div className="sponsor-banner">
          <span className="sponsor-badge">Sponsored</span>
          <span>월 구독 스폰서 업체가 디렉토리에 노출됩니다.</span>
        </div>
      ) : null}

      <div className="category-grid">
        {sponsors?.length ? (
          sponsors.map((biz) => (
            <div key={biz.id} className="sponsor-card">
              <div className="sponsor-badge">Sponsored</div>
              <div className="ko" style={{ marginTop: 8 }}>
                {biz.business_name}
              </div>
              <div className="en">{biz.category || 'Business'}</div>
              <div className="desc">
                {biz.city ? `${biz.city} · ` : ''}
                {biz.website_url || biz.description || ''}
              </div>
            </div>
          ))
        ) : (
          <div className="card empty-state" style={{ gridColumn: '1 / -1' }}>
            등록된 업체가 없습니다. 첫 업체를 등록해보세요!
          </div>
        )}
      </div>
    </div>
  );
}
