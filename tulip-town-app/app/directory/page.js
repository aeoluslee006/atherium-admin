import Link from 'next/link';
import { supabaseRest } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

export default async function DirectoryPage() {
  let businesses = [];
  try {
    businesses = await supabaseRest(
      'businesses?select=*&order=is_sponsored.desc,name.asc'
    );
  } catch {
    businesses = [];
  }

  return (
    <div className="container">
      <div className="row-between">
        <h2 className="section-title">업체 디렉토리 · Business Directory</h2>
        <Link href="/directory/new" className="btn">
          업체 등록
        </Link>
      </div>

      {businesses?.some((b) => b.is_sponsored) ? (
        <div className="sponsor-banner">
          <span className="sponsor-badge">Sponsored</span>
          <span>스폰서 업체가 상단에 노출됩니다.</span>
        </div>
      ) : null}

      <div className="category-grid">
        {businesses?.length ? (
          businesses.map((biz) => (
            <div key={biz.id} className={biz.is_sponsored ? 'sponsor-card' : 'category-card'}>
              {biz.is_sponsored ? <div className="sponsor-badge">Sponsored</div> : null}
              <div className="ko" style={{ marginTop: biz.is_sponsored ? 8 : 0 }}>
                {biz.name}
              </div>
              <div className="en">{biz.category || 'Business'}</div>
              <div className="desc">
                {biz.city ? `${biz.city} · ` : ''}
                {biz.phone || biz.website || biz.description || ''}
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
