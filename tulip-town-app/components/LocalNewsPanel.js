'use client';

import { useMemo, useState } from 'react';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export default function LocalNewsPanel({ items = [] }) {
  const slots = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
    return Array.from({ length: 4 }, (_, i) => rows[i] || null);
  }, [items]);

  const firstIndex = slots.findIndex(Boolean);
  const [active, setActive] = useState(firstIndex >= 0 ? firstIndex : 0);
  const selected = slots[active];

  return (
    <div className="wf-box wf-news">
      <div className="wf-news-thumbs" role="tablist" aria-label="지역뉴스 축소판">
        {slots.map((item, index) => {
          const n = index + 1;
          const selectedClass = active === index ? ' is-active' : '';
          const emptyClass = item ? '' : ' is-empty';
          return (
            <button
              key={item?.id || `slot-${n}`}
              type="button"
              role="tab"
              aria-selected={active === index}
              disabled={!item}
              className={`wf-news-thumb${selectedClass}${emptyClass}`}
              onClick={() => item && setActive(index)}
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
        {selected ? (
          <>
            <div className="wf-news-detail-head">
              <div className="wf-news-detail-meta">
                <span>{selected.source || 'News'}</span>
                {selected.published_at ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <time>{formatDate(selected.published_at)}</time>
                  </>
                ) : null}
              </div>
              <h3 className="wf-news-detail-title">{selected.title}</h3>
              {selected.url ? (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wf-news-detail-link"
                >
                  원문 새 창으로 보기
                </a>
              ) : null}
            </div>
            {selected.url ? (
              <div className="wf-news-frame-wrap">
                <iframe
                  key={selected.id || selected.url}
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
