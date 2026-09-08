'use client';

import { useState } from 'react';

export default function ShopDetailGallery({ images = [], title = '' }) {
  const list = Array.isArray(images) && images.length ? images : [];
  const [index, setIndex] = useState(0);
  const current = list[Math.min(index, list.length - 1)] || '';

  if (!list.length) return null;

  return (
    <div className="shop-detail-gallery">
      <div className="shop-detail-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={title} />
      </div>
      {list.length > 1 ? (
        <div className="shop-detail-thumbs" role="list">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={`shop-detail-thumb${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`사진 ${i + 1}`}
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
