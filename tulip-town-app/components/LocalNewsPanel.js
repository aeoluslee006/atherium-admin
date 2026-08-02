'use client';

import { useEffect, useMemo, useState } from 'react';

const DEMO_NEWS = [
  {
    id: 'demo-1',
    title: '홀랜드 튤립 페스티벌, 올해도 West Michigan 관광객 몰려',
    source: 'MLive',
    url: 'https://www.mlive.com/',
    published_at: '2026-07-28T14:00:00Z',
  },
  {
    id: 'demo-2',
    title: 'Grand Rapids 한인 커뮤니티, 여름 피크닉 행사 안내',
    source: 'TTKC Local',
    url: 'https://tulip-town-app.vercel.app/',
    published_at: '2026-07-30T10:00:00Z',
  },
  {
    id: 'demo-3',
    title: '미시간 운전면허·차량 등록, 신규 정착자 체크리스트',
    source: 'Michigan.gov',
    url: 'https://www.michigan.gov/',
    published_at: '2026-08-01T09:00:00Z',
  },
  {
    id: 'demo-4',
    title: 'Grand Rapids 주말 날씨·행사 모아보기',
    source: 'WOOD TV',
    url: 'https://www.woodtv.com/',
    published_at: '2026-08-02T08:00:00Z',
  },
];

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export default function LocalNewsPanel({ items = [] }) {
  const usingDemo = !Array.isArray(items) || items.length === 0;

  const slots = useMemo(() => {
    const rows = usingDemo ? DEMO_NEWS : items;
    return Array.from({ length: 4 }, (_, i) => rows[i] || null);
  }, [items, usingDemo]);

  const firstIndex = Math.max(
    0,
    slots.findIndex(Boolean)
  );
  const [active, setActive] = useState(firstIndex);

  useEffect(() => {
    if (!slots[active] && firstIndex >= 0) setActive(firstIndex);
  }, [slots, active, firstIndex]);

  const selected = slots[active];

  return (
    <div className="wf-box wf-news">
      <div className="wf-news-thumbs" role="tablist" aria-label="지역뉴스 축소판">
        {slots.map((item, index) => {
          const n = index + 1;
          const isActive = active === index;
          return (
            <button
              key={item?.id || `slot-${n}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`wf-news-thumb${isActive ? ' is-active' : ''}${item ? '' : ' is-empty'}`}
              onClick={() => setActive(index)}
            >
              <span className="wf-news-thumb-label">뉴스 {n}</span>
              {item ? (
                <span className="wf-news-thumb-title">{item.title}</span>
              ) : (
                <span className="wf-news-thumb-title wf-news-thumb-title--muted">비어 있음</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="wf-news-detail" role="tabpanel">
        {usingDemo ? (
          <div className="wf-news-demo-note">샘플 뉴스입니다. Supabase `local_news`에 등록하면 실제 기사로 바뀝니다.</div>
        ) : null}

        {selected ? (
          <>
            <div className="wf-news-detail-head">
              <div className="wf-news-detail-meta">
                <span className="wf-news-detail-slot">뉴스 {active + 1}</span>
                <span>{selected.source || 'News'}</span>
                {selected.published_at ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <time>{formatDate(selected.published_at)}</time>
                  </>
                ) : null}
              </div>
              <h3 className="wf-news-detail-title">{selected.title}</h3>
              <p className="wf-news-detail-summary">
                {selected.source || '지역'} 소식 · 왼쪽에서 다른 뉴스를 고르면 이 칸 내용이 바로 바뀝니다.
              </p>
              {selected.url ? (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wf-news-detail-link"
                >
                  원문 새 창으로 보기 →
                </a>
              ) : null}
            </div>
            {selected.url ? (
              <div className="wf-news-frame-wrap">
                <iframe
                  key={`${selected.id || selected.url}-${active}`}
                  title={selected.title || '지역 뉴스'}
                  src={selected.url}
                  className="wf-news-frame"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="wf-news-detail-empty">연결할 뉴스 주소가 없습니다.</div>
            )}
          </>
        ) : (
          <div className="wf-news-detail-empty">
            <div className="wf-news-placeholder">지역 뉴스 내용보기</div>
            <p>왼쪽 축소판에서 뉴스를 선택하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
