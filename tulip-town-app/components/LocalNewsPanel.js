'use client';

import { useEffect, useMemo, useState } from 'react';

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
  const slots = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
    return Array.from({ length: 4 }, (_, i) => rows[i] || null);
  }, [items]);

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
            </div>
          </article>
        ) : (
          <div className="wf-news-detail-empty">
            <div className="wf-news-placeholder">지역 뉴스 내용보기</div>
            <p>등록된 지역 뉴스가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
