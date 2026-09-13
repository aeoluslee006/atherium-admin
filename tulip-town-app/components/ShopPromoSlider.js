'use client';

import { useEffect, useState } from 'react';

const SLIDES = [
  {
    id: 'market',
    image:
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1800&q=80',
    kicker: 'Best of Tulip Town',
    title: '동네에서 고른 특별한 선물',
    lead: '승인된 판매자의 식품·잡화·생활용품을 한곳에서 둘러보세요.',
  },
  {
    id: 'gift',
    image:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1800&q=80',
    kicker: 'Local makers',
    title: '마음을 담은 선물 찾기',
    lead: '튤립타운 이웃 판매자가 고른 소품과 생활 아이템을 만나보세요.',
  },
  {
    id: 'home',
    image:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1800&q=80',
    kicker: 'Fresh picks',
    title: '식탁을 채우는 한 상자',
    lead: '식품부터 키친 잡화까지, 오늘의 추천을 천천히 둘러보세요.',
  },
  {
    id: 'beauty',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1800&q=80',
    kicker: 'Everyday care',
    title: '나를 위한 작은 루틴',
    lead: '뷰티·헬스 카테고리에서 일상용품을 가볍게 담아보세요.',
  },
];

export default function ShopPromoSlider({ onBrowse }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || SLIDES.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const active = SLIDES[index];

  return (
    <section
      className="shop-promo"
      aria-label="튤립가게 프로모션"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.id}
          className={`shop-promo-slide${i === index ? ' is-active' : ''}`}
          aria-hidden={i !== index}
        >
          <div
            className="shop-promo-media"
            style={{ backgroundImage: `url('${slide.image}')` }}
          />
        </div>
      ))}

      <div className="shop-promo-copy">
        <p className="shop-promo-kicker">{active.kicker}</p>
        <h2 className="shop-promo-title">{active.title}</h2>
        <p className="shop-promo-lead">{active.lead}</p>
        <button type="button" className="shop-promo-cta" onClick={onBrowse}>
          상품 둘러보기
        </button>
      </div>

      <div className="shop-promo-dots" role="tablist" aria-label="프로모션 슬라이드">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`${i + 1}번째 슬라이드`}
            className={`shop-promo-dot${i === index ? ' is-active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
