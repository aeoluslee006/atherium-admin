/** Public tulip-shop catalog helpers (filters / categories). */

export const SHOP_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'food', label: '식품·음료' },
  { id: 'fashion', label: '패션·잡화' },
  { id: 'home', label: '생활·인테리어' },
  { id: 'beauty', label: '뷰티·헬스' },
  { id: 'kids', label: '키즈·육아' },
  { id: 'other', label: '기타' },
];

export const SHOP_SORTS = [
  { id: 'newest', label: '최신순' },
  { id: 'price_asc', label: '낮은 가격순' },
  { id: 'price_desc', label: '높은 가격순' },
];

export function shopCategoryLabel(id) {
  return SHOP_CATEGORIES.find((c) => c.id === id)?.label || id || '기타';
}

export function filterShopItems(items, { category = 'all', sort = 'newest', q = '' } = {}) {
  const query = String(q || '')
    .trim()
    .toLowerCase();
  let list = Array.isArray(items) ? [...items] : [];

  if (category && category !== 'all') {
    list = list.filter((item) => String(item.category || 'other') === category);
  }

  if (query) {
    list = list.filter((item) => {
      const seller = item.sponsor || item.sponsors;
      const hay = [
        item.title,
        item.description,
        seller?.business_name,
        seller?.city,
        shopCategoryLabel(item.category),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }

  if (sort === 'price_asc') {
    list.sort((a, b) => Number(a.price_cents || 0) - Number(b.price_cents || 0));
  } else if (sort === 'price_desc') {
    list.sort((a, b) => Number(b.price_cents || 0) - Number(a.price_cents || 0));
  } else {
    list.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }

  return list;
}

export function productImageList(item) {
  if (!item) return [];
  if (Array.isArray(item.image_urls) && item.image_urls.length) {
    return item.image_urls.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (item.image_url) {
    return String(item.image_url)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
