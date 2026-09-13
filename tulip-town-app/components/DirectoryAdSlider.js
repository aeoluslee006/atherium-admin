'use client';

import { useEffect, useState } from 'react';
import { normalizeAdImageUrls, primaryAdImage } from '../lib/directoryAdContent';

/** Auto-rotating image strip for newspaper cells. */
export default function DirectoryAdSlider({ ad, className = '' }) {
  const urls = normalizeAdImageUrls(ad?.ad_image_urls, ad?.ad_image_url);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [urls.join('|')]);

  useEffect(() => {
    if (urls.length < 2) return undefined;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % urls.length);
    }, 2800);
    return () => clearInterval(t);
  }, [urls.length]);

  if (!urls.length) {
    return <div className={`dir-ad-image dir-ad-image--placeholder ${className}`.trim()} />;
  }

  const current = urls[Math.min(index, urls.length - 1)] || primaryAdImage(ad);

  return (
    <div className={`dir-ad-slider ${className}`.trim()}>
      {/* Blurred cover fills the slot; sharp photo sits on top without cropping */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        className="dir-ad-image dir-ad-image--bg"
        draggable={false}
        aria-hidden="true"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current} alt="" className="dir-ad-image dir-ad-image--fg" draggable={false} />
      {urls.length > 1 ? (
        <div className="dir-ad-slider-dots" aria-hidden="true">
          {urls.map((u, i) => (
            <span key={`${u}-${i}`} className={`dir-ad-dot${i === index ? ' is-active' : ''}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
