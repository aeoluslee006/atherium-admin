'use client';

import { useEffect, useMemo, useState } from 'react';

const DEMO_NEWS = [
  {
    id: 'demo-1',
    title: '홀랜드 튤립 페스티벌, 올해도 West Michigan 관광객 몰려',
    source: 'MLive',
    url: 'https://www.mlive.com/',
    published_at: '2026-07-28T14:00:00Z',
    summary:
      '홀랜드 시내와 Windmill Island 일대에 봄·여름 방문객이 이어지고 있습니다. 축제 일정, 주차, 지역 상점 할인 정보를 한눈에 정리했습니다.',
  },
  {
    id: 'demo-2',
    title: 'Grand Rapids 한인 커뮤니티, 여름 피크닉 행사 안내',
    source: 'TTKC Local',
    url: 'https://tulip-town-app.vercel.app/',
    published_at: '2026-07-30T10:00:00Z',
    summary:
      '서부 미시간 한인 가족이 모이는 여름 피크닉 일정이 공개되었습니다. 장소·시간·참가 신청 방법은 커뮤니티 공지를 확인해 주세요.',
  },
  {
    id: 'demo-3',
    title: '미시간 운전면허·차량 등록, 신규 정착자 체크리스트',
    source: 'Michigan.gov',
    url: 'https://www.michigan.gov/',
    published_at: '2026-08-01T09:00:00Z',
    summary:
      '미시간 신규 정착자가 꼭 알아야 할 운전면허 전환, 차량 등록, 보험 준비 항목을 단계별로 안내합니다. 필요한 서류 목록도 함께 확인하세요.',
  },
  {
    id: 'demo-4',
    title: 'Grand Rapids 주말 날씨·행사 모아보기',
    source: 'WOOD TV',
    url: 'https://www.woodtv.com/',
    published_at: '2026-08-02T08:00:00Z',
    summary:
      '이번 주말 Grand Rapids·Holland 날씨 전망과 가족 행사, 마켓·공연 일정을 모았습니다. 나들이 전에 한 번 훑어보세요.',
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

function hostnameOf(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
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

  const firstIndex = Math.max(0, slots.findIndex(Boolean));
  const [active, setActive] = useState(firstIndex);

  useEffect(() => {
    if (!slots[active] && firstIndex >= 0) setActive(firstIndex);
  }, [slots, active, firstIndex]);

  const selected = slots[active];
  const summary =
    selected?.summary ||
    selected?.body ||
    (selected
      ? `${selected.source || '지역'} 소식입니다. 왼쪽에서 다른 항목을 고르면 이 칸 내용이 바뀝니다.`
      : '');

  return (
    <div className="wf-box wf-news">
      <div className="wf-news-thumbs" role="tablist" aria-label="지역뉴스 목록">
        {slots.map((item, index) => {
          const n = index + 1;
          const isActive = active === index;
          return (
            <button
              key={item?.id || `slot-${n}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="wf-news-panel"
              id={`wf-news-tab-${n}`}
              aria-label={item?.title || `지역 뉴스 ${n}`}
              className={`wf-news-thumb${isActive ? ' is-active' : ''}${item ? '' : ' is-empty'}`}
              onClick={() => setActive(index)}
              disabled={!item}
            >
              {item ? (
                <span className="wf-news-thumb-title">{item.title}</span>
              ) : (
                <span className="wf-news-thumb-title wf-news-thumb-title--muted">비어 있음</span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id="wf-news-panel"
        className="wf-news-detail"
        role="tabpanel"
        aria-labelledby={`wf-news-tab-${active + 1}`}
        key={selected?.id || `empty-${active}`}
      >
        {usingDemo ? (
          <div className="wf-news-demo-note">
            샘플 뉴스입니다. Supabase `local_news`에 등록하면 실제 기사로 바뀝니다.
          </div>
        ) : null}

        {selected ? (
          <article className="wf-news-article">
            <div className="wf-news-detail-head">
              <div className="wf-news-detail-meta">
                <span>{selected.source || 'News'}</span>
                {selected.published_at ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <time dateTime={selected.published_at}>{formatDate(selected.published_at)}</time>
                  </>
                ) : null}
              </div>
              <h3 className="wf-news-detail-title">{selected.title}</h3>
            </div>

            <div className="wf-news-article-body">
              <p className="wf-news-article-summary">{summary}</p>

              <div className="wf-news-article-card" data-slot={active + 1}>
                <div className="wf-news-article-card-source">{selected.source || '지역 뉴스'}</div>
                {hostnameOf(selected.url) ? (
                  <div className="wf-news-article-card-host">{hostnameOf(selected.url)}</div>
                ) : null}
                {selected.url ? (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wf-news-detail-cta"
                  >
                    원문 새 창으로 보기
                  </a>
                ) : (
                  <p className="wf-news-article-missing">연결할 뉴스 주소가 없습니다.</p>
                )}
              </div>

              <p className="wf-news-article-hint">
                왼쪽 목록을 누르면 이 칸의 제목과 내용이 바뀝니다.
              </p>
            </div>
          </article>
        ) : (
          <div className="wf-news-detail-empty">
            <div className="wf-news-placeholder">지역 뉴스 내용보기</div>
            <p>왼쪽에서 뉴스를 선택하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
