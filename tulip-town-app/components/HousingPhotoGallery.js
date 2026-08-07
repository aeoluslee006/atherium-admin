'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Housing detail photo gallery — main image + thumbnail strip.
 */
export default function HousingPhotoGallery({ images = [], title = '매물 사진' }) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [list.join('|')]);

  const go = useCallback(
    (dir) => {
      if (list.length < 2) return;
      setIndex((i) => (i + dir + list.length) % list.length);
    },
    [list.length]
  );

  useEffect(() => {
    if (list.length < 2) return undefined;
    function onKey(e) {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, list.length]);

  if (!list.length) return null;

  const safeIndex = Math.min(index, list.length - 1);
  const current = list[safeIndex];

  return (
    <div className="housing-gallery">
      <div className="housing-gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={`${title} ${safeIndex + 1}`} />
        {list.length > 1 ? (
          <>
            <button
              type="button"
              className="housing-gallery-nav housing-gallery-nav--prev"
              onClick={() => go(-1)}
              aria-label="이전 사진"
            >
              ‹
            </button>
            <button
              type="button"
              className="housing-gallery-nav housing-gallery-nav--next"
              onClick={() => go(1)}
              aria-label="다음 사진"
            >
              ›
            </button>
            <span className="housing-gallery-count">
              {safeIndex + 1}/{list.length}
            </span>
          </>
        ) : null}
      </div>

      {list.length > 1 ? (
        <div className="housing-gallery-thumbs" role="list">
          {list.map((src, i) => (
            <button
              key={`${src.slice(0, 40)}-${i}`}
              type="button"
              role="listitem"
              className={`housing-gallery-thumb${i === safeIndex ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`사진 ${i + 1}`}
              aria-current={i === safeIndex ? 'true' : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
