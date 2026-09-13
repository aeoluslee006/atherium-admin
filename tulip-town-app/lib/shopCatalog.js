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

/** Shipping scope filter (products.shipping_scope). */
export const SHOP_SHIPPING_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'local', label: '로컬만' },
  { id: 'nationwide', label: '전국배송만' },
];

/**
 * City filter groups on sponsors.city.
 * West Michigan covers nearby West MI cities already used on seller apply.
 */
export const SHOP_CITY_FILTERS = [
  { id: 'all', label: '전체 지역' },
  { id: 'Holland', label: 'Holland' },
  { id: 'Grand Rapids', label: 'Grand Rapids' },
  { id: 'West Michigan', label: 'West Michigan' },
  { id: 'Other', label: 'Other' },
];

const WEST_MICHIGAN_CITIES = new Set(['west michigan', 'zeeland', 'hudsonville']);

export function shopCategoryLabel(id) {
  return SHOP_CATEGORIES.find((c) => c.id === id)?.label || id || '기타';
}

export function shopShippingLabel(scope) {
  if (scope === 'nationwide') return '전국배송';
  return '로컬';
}

export function normalizeShippingScope(value) {
  return value === 'nationwide' ? 'nationwide' : 'local';
}

function sellerCity(item) {
  const seller = item?.sponsor || item?.sponsors;
  return String(seller?.city || '').trim();
}

function matchesCityFilter(item, cityFilter) {
  if (!cityFilter || cityFilter === 'all') return true;
  const city = sellerCity(item);
  const lower = city.toLowerCase();

  if (cityFilter === 'Holland') return lower === 'holland';
  if (cityFilter === 'Grand Rapids') return lower === 'grand rapids';
  if (cityFilter === 'Other') return lower === 'other' || !city;
  if (cityFilter === 'West Michigan') return WEST_MICHIGAN_CITIES.has(lower);
  return city === cityFilter;
}

export function filterShopItems(
  items,
  { category = 'all', sort = 'newest', q = '', shipping = 'all', city = 'all' } = {}
) {
  const query = String(q || '')
    .trim()
    .toLowerCase();
  let list = Array.isArray(items) ? [...items] : [];

  if (category && category !== 'all') {
    list = list.filter((item) => String(item.category || 'other') === category);
  }

  if (shipping && shipping !== 'all') {
    list = list.filter(
      (item) => normalizeShippingScope(item.shipping_scope) === shipping
    );
  }

  if (city && city !== 'all') {
    list = list.filter((item) => matchesCityFilter(item, city));
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
        shopShippingLabel(item.shipping_scope),
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
